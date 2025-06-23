import {
  client as mqttClient,
  publish as mqttPublish,
  TOPIC_SENSOR,
  TOPIC_SENSSET,
  TOPIC_SENSACK,
  TOPIC_ALARMSET,
  TOPIC_ALARMACK
} from './mqttPublisher.js';
import { PrismaClient } from '@prisma/client';

import {
  notifyOutOfRange,
  bot,
  pendingAck,
  pendingStore,
  pendingAlarmAck,
  pendingAlarmStore,
  lastAlarmList,
  esc,
  SensorLabel
} from './teleBot.js';

export const sensorBuffer = [];

// Helper untuk parsing JSON
function safeParseJson(buffer) {
  try {
    return JSON.parse(buffer.toString());
  } catch (e) {
    console.error('❌ Invalid JSON:', e);
    return null;
  }
}

export default function initMqtt(io) {
  const prisma = new PrismaClient();
  const lastProcessedTemp = new Map();
  async function notify(text, deviceId) {
    try {
      const ud = await prisma.usersDevice.findUnique({
        where: { id: deviceId },
        include: { user: true }
      });
      const chatId = ud?.user?.telegramChatId;
      if (!chatId) return;  // jika belum ada chatId, skip

      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('❌ Gagal kirim notifikasi Telegram:', e);
    }
  }
  // MQTT message handler
  mqttClient.on('message', async (topic, buf, packet) => {
    const msg = buf.toString();
    switch (topic) {
      case TOPIC_SENSOR:
        return handleSensorData(prisma, io, msg);
      case TOPIC_SENSSET:
        return handleSetSensor(prisma, msg);
      case TOPIC_SENSACK:
        return handleAckSetSensor(prisma, buf, packet);
      case TOPIC_ALARMSET:
        return handleAlarmRequests(prisma, msg, lastProcessedTemp);
      case TOPIC_ALARMACK:
        return handleAlarmAck(prisma, buf, packet);
      default:
        return;
    }
  });

  // Socket.IO integration (unchanged)
  io.on('connection', async socket => {
    console.log('🔗 Client connected:', socket.id);

    const history = await prisma.sensorData.findMany({
      where: { deviceId: 'TOPIC_ID' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    socket.emit('sensor_history', history.reverse());

    const led = await prisma.ledStatus.findUnique({ where: { deviceId: 'TOPIC_ID' } });
    socket.emit('led_state', led?.state ? 'ON' : 'OFF');

    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: 'TOPIC_ID' },
      orderBy: { type: 'asc' }
    });
    socket.emit('sensor_settings', settings);

    socket.on('set_sensor', setting => {
      const req = {
        cmd: 'SET_SENSOR',
        from: 'BACKEND',
        deviceId: 'TOPIC_ID',
        sensor: { id: setting.id || 0, type: setting.type, minValue: setting.minValue, maxValue: setting.maxValue, enabled: setting.enabled }
      };
      mqttPublish('sensorset', req);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  async function handleSensorData(prisma, io, msg) {
    const data = safeParseJson(msg);
    if (!data) return;

    try {
      const userDevice = await prisma.usersDevice.findFirst({ where: { id: data.deviceId } });
      if (!userDevice) {
        console.warn(`⚠️ Skipped: device ${data.deviceId} belum terdaftar`);
        return;
      }
      sensorBuffer.push({
        timestamp: new Date(),
        userId: userDevice.userId,
        deviceId: userDevice.id,      // <-- simpan UUID
        deviceName: userDevice.deviceName,
        ...data
      });

      io.emit('sensor_data', data);
      await notifyOutOfRange(data.deviceId, data);
    } catch (e) {
      console.error('❌ Error buffer SensorData:', e);
    }
  }

  async function handleSetSensor(prisma, msg) {
    const req = safeParseJson(msg);
    if (!req) return;

    const { cmd, from, deviceId, sensor: payload } = req;
    const sensors = Array.isArray(payload) ? payload : [payload];

    const userDevice = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
    if (!userDevice) {
      console.warn(`⚠️ Device UUID ${deviceId} belum terdaftar`);
      return;
    }
    // const realDeviceId = userDevice.deviceId;
    const userId = userDevice.userId;
    const typeMap = { 0: 'TEMPERATURE', 1: 'TURBIDITY', 2: 'TDS', 3: 'PH' };

    if (cmd === 'INIT_SENSOR') await initSensorSetting(sensors);
    else if (cmd === 'SET_SENSOR' && from === 'ESP') {
      for (const s of sensors) await applySetSensor(s);
    }

    async function initSensorSetting(sensors) {
      const updatedTypes = [];
      const createdTypes = [];

      for (const s of sensors) {
        const enumType = typeMap[s.type];
        try {
          const exists = await prisma.sensorSetting.findFirst({
            where: { deviceId: userDevice.id, userId, type: enumType }
          });

          if (exists) {
            await prisma.sensorSetting.update({
              where: { id: exists.id },
              data: { minValue: s.minValue, maxValue: s.maxValue, enabled: s.enabled }
            });
            updatedTypes.push(enumType);
          } else {
            await prisma.sensorSetting.create({
              data: {
                deviceId: userDevice.id,
                userId,
                type: enumType,
                minValue: s.minValue,
                maxValue: s.maxValue,
                enabled: s.enabled
              }
            });
            createdTypes.push(enumType);
          }
        } catch (e) {
          console.error('❌ Error INIT_SENSOR for', enumType, e);
        }
      }

      // Now send a single notification summarizing the batch
      let title;
      if (updatedTypes.length && createdTypes.length) {
        title = `🔄 Updated [${updatedTypes.join(', ')}], 🔔 Added [${createdTypes.join(', ')}] sensors`;
      } else if (updatedTypes.length) {
        title = `🔄 Updated sensors: ${updatedTypes.join(', ')}`;
      } else if (createdTypes.length) {
        title = `🔔 Added sensors: ${createdTypes.join(', ')}`;
      } else {
        title = `⚠️ INIT_SENSOR received, but no changes applied`;
      }

      await notify(title, userDevice.id);
    }

    async function applySetSensor(s) {
      const enumType = typeMap[s.type];
      if (!enumType) return console.error(`Unknown type ${s.type}`);
      try {
        const updated = await prisma.sensorSetting.update({
          where: { deviceId_userId_type: { deviceId: userDevice.id, userId, type: enumType } },
          data: { minValue: s.minValue, maxValue: s.maxValue, enabled: s.enabled }
        });
        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (user?.telegramChatId) {
          const text = `Device: ${userDevice.deviceName}\n✅ ${enumType} diset via perangkat ke ${updated.minValue}–${updated.maxValue}, ${updated.enabled ? 'enabled' : 'disabled'}.`;
          await bot.sendMessage(user.telegramChatId, text);
        }
      } catch (e) {
        console.error('❌ Error SET_SENSOR:', e);
      }
    }
  }

  async function handleAckSetSensor(prisma, buf, packet) {
    if (packet.retain) return;

    let ack;
    try {
      ack = JSON.parse(buf.toString());
    } catch {
      return;
    }

    if (ack.from !== 'ESP') return;

    if (ack.cmd === 'ACK_SYNC_SENSOR') {
      // 1) Fetch settings + chat info
      const allSettings = await prisma.sensorSetting.findMany({
        where: { deviceId: ack.deviceId },
        orderBy: { id: 'asc' }
      });
      const ud = await prisma.usersDevice.findUnique({
        where: { id: ack.deviceId },
        include: { user: true }
      });
      const chatId = ud?.user?.telegramChatId;
      const deviceName = ud?.deviceName || ack.deviceId;
      if (!chatId) return;

      // 2) Compute column widths
      const nums = allSettings.map((_, i) => `${i + 1}`);
      const labels = allSettings.map(s => s.type);
      const ranges = allSettings.map(s => `${s.minValue.toFixed(1)}–${s.maxValue.toFixed(1)}`);
      const statuses = allSettings.map(s => s.enabled ? '✅' : '🚫');

      const wNo = Math.max(2, ...nums.map(n => n.length));
      const wLabel = Math.max(6, ...labels.map(l => l.length));
      const wRange = Math.max(5, ...ranges.map(r => r.length));
      const wStat = 6;  // enough to fit "Status"

      // 3) Build header row
      const header = [
        'No'.padEnd(wNo),
        'Sensor'.padEnd(wLabel),
        'Range'.padEnd(wRange),
        'Status'.padEnd(wStat)
      ].join(' │ ');

      // 4) Build separator row
      const sep = [
        '─'.repeat(wNo),
        '─'.repeat(wLabel),
        '─'.repeat(wRange),
        '─'.repeat(wStat)
      ].join('──');

      // 5) Build data rows
      const rows = allSettings.map((s, i) => {
        return [
          nums[i].padEnd(wNo),
          labels[i].padEnd(wLabel),
          ranges[i].padEnd(wRange),
          statuses[i].padEnd(wStat)
        ].join(' │ ');
      });

      // 6) Assemble message
      const msg = [
        `✅ *Sinkron Sensor Berhasil pada ${deviceName}*`,
        '```',
        header,
        sep,
        ...rows,
        '```'
      ].join('\n');

      // 7) Send
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      return;
    }


    // 2) Single‐sensor ACK
    if (ack.cmd !== 'ACK_SET_SENSOR') return;

    const key = `${ack.deviceId}-${ack.sensor.type}`;
    const store = pendingStore.get(key);

    if (store) {
      try {
        await prisma.sensorSetting.update({
          where: {
            deviceId_userId_type: {
              deviceId: store.deviceId,
              userId: store.userId,
              type: store.enumType
            }
          },
          data: {
            minValue: store.minValue,
            maxValue: store.maxValue,
            enabled: store.enabled
          }
        });
      } catch (e) {
        console.error('❌ DB ACK_SET_SENSOR failed', e);
      }
      pendingStore.delete(key);
    }

    const chatId = pendingAck.get(key);
    if (chatId && store) {
      const label = SensorLabel[ack.sensor.type] || `Type${ack.sensor.type}`;
      const action = store.enabled ? 'enabled' : 'disabled';
      let text;
      if (store.minValue != null) {
        text = `✅ *${label}* pada *${store.deviceName}* diset ke ` +
          `${store.minValue.toFixed(1)}–${store.maxValue.toFixed(1)}, _${action}_.`;
      } else {
        text = `✅ *${label}* pada *${store.deviceName}* telah _${action}_.`;
      }

      try {
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('❌ Telegram ACK send failed', e);
      }
      pendingAck.delete(key);
    }
  }

  async function handleAlarmRequests(prisma, msg, lastProcessedTemp) {
    const req = safeParseJson(msg);
    if (!req) return;

    const { cmd, from, deviceId, alarm, tempIndex } = req;
    if (from !== 'ESP') return;
    const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId }, include: { user: false } });
    // helper untuk kirim notif ke both Telegram & WebSocket
    async function notifyAll(text) {
      await notify(text, deviceId);
      io.emit('alarm_notification', { deviceId, message: text });
    }

    if (cmd === 'REQUEST_ADD_ALARM' && from === 'ESP') {
      if (lastProcessedTemp.get(deviceId) === tempIndex) return;
      lastProcessedTemp.set(deviceId, tempIndex);
      const created = await prisma.alarm.create({ data: { deviceId, hour: alarm.hour, minute: alarm.minute, duration: alarm.duration, enabled: alarm.enabled } });
      const text = `✅ *Alarm baru* di _${ud.deviceName}_ dibuat via perangkat
` +
        `⏰ Jam: \`${String(created.hour).padStart(2, '0')}:${String(created.minute).padStart(2, '0')}\`
` +
        `⏱ Durasi: \`${created.duration}s\``;
      await notifyAll(text);
      return mqttPublish('alarmack', { cmd: 'ACK_ADD_ALARM', from: 'BACKEND', deviceId, alarm: { id: created.id }, tempIndex });
    }

    if (cmd === 'REQUEST_EDIT_ALARM' && from === 'ESP') {
      try {
        await prisma.alarm.update({ where: { id: alarm.id }, data: { hour: alarm.hour, minute: alarm.minute, duration: alarm.duration, enabled: alarm.enabled } });
        const text = `✏️ *Alarm* di _${ud.deviceName}_ diedit via perangkat
  ` +
          `⏰ Jam: \`${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}\`
  ` +
          `⏱ Durasi: \`${alarm.duration}s\``;
        await notifyAll(text);
        return mqttPublish('alarmack', { cmd: 'ACK_EDIT_ALARM', from: 'BACKEND', deviceId, alarm: { id: alarm.id } });
      } catch (err) {
        console.error('Gagal update alarm:', err);
        return mqttPublish('alarmaset', {
          cmd: 'SYNC_ALARM',
          from: 'BACKEND',
          deviceId
        });
      }
    }

    if (cmd === 'REQUEST_DELETE_ALARM' && from === 'ESP') {
      await prisma.alarm.delete({ where: { id: alarm.id } });
      const text = `🗑️ *Alarm* di _${ud.deviceName}_ telah dihapus via perangkat`;
      await notifyAll(text);
      return mqttPublish('alarmack', { cmd: 'ACK_DELETE_ALARM', from: 'BACKEND', deviceId, alarm: { id: alarm.id } });
    }
  }

  async function handleAlarmAck(prisma, buf, packet) {
    if (packet.retain) return;
    let ack;
    try { ack = JSON.parse(buf.toString()); } catch { return; }
    if (ack.from !== 'ESP') return;

    const { cmd, deviceId, alarm, status } = ack;
    let key;
    if (status !== 'OK') return;
    switch (cmd) {
      case 'ACK_ADD_ALARM': key = `${deviceId}-ADD_ALARM-${alarm.id}`; break;
      case 'ACK_EDIT_ALARM': key = `${deviceId}-EDIT_ALARM-${alarm.id}`; break;
      case 'ACK_DELETE_ALARM': key = `${deviceId}-DELETE_ALARM-${alarm.id}`; break;
      case 'ACK_ENABLE_ALARM': key = `${deviceId}-ENABLE_ALARM-${alarm.id}`; break;
      case 'ACK_DISABLE_ALARM': key = `${deviceId}-DISABLE_ALARM-${alarm.id}`; break;
      case 'ACK_SYNC_ALARM': key = `${deviceId}-SYNC_ALARM`; break;
      default: return;
    }
    const chatId = pendingAlarmAck.get(key);
    const store = pendingAlarmStore.get(key);

    try {
      if (cmd === 'ACK_EDIT_ALARM' && store) await prisma.alarm.update({ where: { id: alarm.id }, data: store });
      else if (cmd === 'ACK_DELETE_ALARM') await prisma.alarm.delete({ where: { id: alarm.id } });
      else if (cmd === 'ACK_ENABLE_ALARM') await prisma.alarm.update({ where: { id: alarm.id }, data: { enabled: true } });
      else if (cmd === 'ACK_DISABLE_ALARM') await prisma.alarm.update({ where: { id: alarm.id }, data: { enabled: false } });
    } catch (e) {
      console.error('❌ DB alarm ACK failed', e);
    }

    if (chatId) {
      let msg;
      const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
      const deviceName = ud?.deviceName || deviceName;
      switch (cmd) {
        case 'ACK_ADD_ALARM': {
          const rec = await prisma.alarm.findUnique({ where: { id: alarm.id } });
          msg = `<b>✅ Alarm baru dibuat pada ${esc(deviceName)}</b>\n⏰ Jam: <code>${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}</code>\n⏱ Durasi: <code>${rec.duration}s</code>`;
          break;
        }
        case 'ACK_EDIT_ALARM': {
          const rec = await prisma.alarm.findUnique({ where: { id: alarm.id } });
          msg = `✅ <b>Edit Alarm berhasil pada ${esc(deviceName)}</b>\n⏰ Jam: <code>${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}</code>\n⏱ Durasi: <code>${rec.duration}s</code>`;
          break;
        }
        case 'ACK_SYNC_ALARM': {
          // 1) Fetch alarms + device/chat info
          const allAlarms = await prisma.alarm.findMany({
            where: { deviceId },
            orderBy: { id: 'asc' }
          });
          const ud = await prisma.usersDevice.findUnique({
            where: { id: deviceId },
            include: { user: true }
          });
          const chatId = ud?.user?.telegramChatId;
          const deviceName = ud?.deviceName || deviceId;
          if (!chatId) break;

          // 2) Build rows array: [No, Time, Status]
          const rows = allAlarms.map((a, i) => {
            const no = `${i + 1}`;
            const time = `${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')}`;
            const status = a.enabled ? '✅' : '🚫';
            return [no, time, status];
          });

          // 3) Compute column widths
          const header = ['No', 'Time', 'Status'];
          const widths = header.map((h, col) => {
            return Math.max(
              h.length,
              ...rows.map(r => r[col].length)
            );
          });

          // 4) Helper to pad
          const pad = (str, w, left = true) =>
            left ? str.padStart(w) : str.padEnd(w);

          // 5) Build table lines
          const hdrLine = header
            .map((h, i) => pad(h, widths[i], false))
            .join(' │ ');
          const sepLine = widths
            .map(w => '─'.repeat(w))
            .join('──');
          const dataLines = rows.map(cols =>
            cols.map((c, i) => pad(c, widths[i], i === 0))  // right‐align “No”, left‐align others
              .join(' │ ')
          );

          // 6) Assemble message
          const msg = [
            `✅ *Sinkron Alarm Berhasil pada ${deviceName}*`,
            '```',
            hdrLine,
            sepLine,
            ...dataLines,
            '```'
          ].join('\n');

          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
          pendingAlarmAck.delete(key);
          pendingAlarmStore.delete(key);
          break;
        }

        default: {
          const idxList = lastAlarmList.get(`${chatId}-${deviceId}`) || [];
          const idx = idxList.indexOf(alarm.id) + 1;
          const action = cmd.replace(/^ACK_/, '').split('_')[0].toLowerCase();
          msg = `✅ <b>Alarm ${idx} berhasil di-${action}.</b>`;
        }
      }
      await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
      pendingAlarmAck.delete(key);
      pendingAlarmStore.delete(key);
    }
  }
}
