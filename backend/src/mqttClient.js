// src/mqttClient.js
import {
  client as mqttClient,
  publish as mqttPublish,
  TOPIC_SENSOR,
  TOPIC_SENSSET,
  TOPIC_SENSACK,
} from './mqttPublisher.js';
import eventBus from './lib/eventBus.js';
import { prisma } from './application/database.js';
import { notifyOutOfRange, bot, pendingAck, pendingStore, SensorLabel } from './teleBot.js';

export const sensorBuffer = [];

// ------------- Utils -------------
function safeParseJson(str) {
  try {
    if (!str || typeof str !== 'string' || !str.trim()) return null;
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function sanitizeMarkdown(text) {
  // Minimal sanitizer untuk Markdown
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// ------------- Core -------------
export default function initMqtt(io) {
  eventBus.setIoInstance(io);

  // MQTT subscriptions (pastikan subscribe di tempat lain jika perlu)
  mqttClient.on('message', onMessage);
  // Optional visibility
  // mqttClient.on('connect', () => console.log('MQTT connected'));
  // mqttClient.on('error', (e) => console.error('MQTT error:', e));

  io.on('connection', socket => {
    socket.on('set_sensor', setting => {
      const req = {
        cmd: 'SET_SENSOR',
        from: 'BACKEND',
        deviceId: setting.deviceId, // gunakan deviceId sebenarnya
        sensor: {
          id: setting.id || 0,
          type: setting.type,
          minValue: setting.minValue,
          maxValue: setting.maxValue,
          enabled: setting.enabled,
        },
      };
      mqttPublish(TOPIC_SENSSET, req);
    });
  });

  async function onMessage(topic, buf, packet) {
    const msg = buf?.toString?.() ?? '';
    if (!msg) return;

    try {
      switch (topic) {
        case TOPIC_SENSOR:
          await handleSensorData(msg);
          break;
        case TOPIC_SENSSET:
          await handleSetSensor(msg);
          break;
        case TOPIC_SENSACK:
          await handleAckSetSensor(buf, packet);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error(`❌ MQTT handler error on ${topic}:`, e);
    }
  }

  async function handleSensorData(msg) {
    const data = safeParseJson(msg);
    if (!data) return;

    // Validasi minimal payload
    const { deviceId, temperature, tds, ph, turbidity } = data;
    if (!deviceId) return;
    if (![temperature, tds, ph, turbidity].some(isFiniteNumber)) {
      // tidak ada angka valid, abaikan
      return;
    }

    try {
      const userDevice = await prisma.usersDevice.findUnique({
        where: { id: deviceId },
      });
      if (!userDevice) {
        console.warn(`⚠️ Skipped: device ${deviceId} belum terdaftar`);
        return;
      }

      // Push ke buffer (dipakai cron flush)
      sensorBuffer.push({
        timestamp: new Date(),
        userId: userDevice.userId,
        deviceId: userDevice.id,
        deviceName: userDevice.deviceName,
        temperature,
        tds,
        ph,
        turbidity,
      });

      // Emit ke client realtime
      eventBus.emitTo('sensor_data', {
        deviceId,
        temperature,
        tds,
        ph,
        turbidity,
        ts: Date.now(),
      });

      // Alarm/Notifikasi out-of-range (dibatasi di fungsi itu)
      await notifyOutOfRange(deviceId, { temperature, tds, ph, turbidity });
    } catch (e) {
      console.error('❌ Error buffer SensorData:', e);
    }
  }

  async function handleSetSensor(msg) {
    const req = safeParseJson(msg);
    if (!req) return;

    const { cmd, from, deviceId, sensor: payload } = req;
    if (!deviceId) return;

    const userDevice = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
    if (!userDevice) {
      console.warn(`⚠️ Device UUID ${deviceId} belum terdaftar`);
      return;
    }

    const userId = userDevice.userId;
    const typeMap = { 0: 'TEMPERATURE', 1: 'TURBIDITY', 2: 'TDS', 3: 'PH' };

    const sensors = Array.isArray(payload) ? payload : [payload];

    if (cmd === 'INIT_SENSOR') return initSensorSetting(sensors, userDevice, userId, typeMap);
    if (cmd === 'SET_SENSOR' && from === 'ESP') {
      for (const s of sensors) await applySetSensor(s, userDevice, userId, typeMap);
    }
  }

  async function initSensorSetting(sensors, userDevice, userId, typeMap) {
    const updatedTypes = [];
    const createdTypes = [];

    for (const s of sensors) {
      const enumType = typeMap[s.type];
      if (!enumType) continue;

      try {
        const exists = await prisma.sensorSetting.findFirst({
          where: { deviceId: userDevice.id, userId, type: enumType },
        });

        if (exists) {
          await prisma.sensorSetting.update({
            where: { id: exists.id },
            data: {
              minValue: s.minValue,
              maxValue: s.maxValue,
              enabled: !!s.enabled,
            },
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
              enabled: !!s.enabled,
            },
          });
          createdTypes.push(enumType);
        }
      } catch (e) {
        console.error('❌ Error INIT_SENSOR for', enumType, e);
      }
    }

    // Notification summary
    const deviceTitle = sanitizeMarkdown(userDevice.deviceName || userDevice.id);
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

    try {
      const ud = await prisma.usersDevice.findUnique({
        where: { id: userDevice.id },
        include: { user: true },
      });
      const chatId = ud?.user?.telegramChatId;
      if (chatId) {
        await bot.sendMessage(chatId, `*${deviceTitle}*\n${sanitizeMarkdown(title)}`, {
          parse_mode: 'Markdown',
        });
      }
    } catch (e) {
      console.error('❌ Gagal kirim notifikasi Telegram:', e);
    }
  }

  async function applySetSensor(s, userDevice, userId, typeMap) {
    const enumType = typeMap[s.type];
    if (!enumType) return;

    try {
      const updated = await prisma.sensorSetting.update({
        where: { deviceId_userId_type: { deviceId: userDevice.id, userId, type: enumType } },
        data: { minValue: s.minValue, maxValue: s.maxValue, enabled: !!s.enabled },
      });

      const user = await prisma.users.findUnique({ where: { id: userId } });
      const chatId = user?.telegramChatId;
      if (chatId) {
        const deviceTitle = sanitizeMarkdown(userDevice.deviceName || userDevice.id);
        const text = `Device: *${deviceTitle}*\n✅ ${enumType} diset via perangkat ke ${updated.minValue}–${updated.maxValue}, ${updated.enabled ? 'enabled' : 'disabled'}.`;
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      console.error('❌ Error SET_SENSOR:', e);
    }
  }

  async function handleAckSetSensor(buf, packet) {
    if (packet?.retain) return;

    let ack = safeParseJson(buf?.toString?.() ?? '');
    if (!ack || ack.from !== 'ESP') return;

    if (ack.cmd === 'ACK_SYNC_SENSOR') {
      await sendSyncTable(ack.deviceId);
      return;
    }

    if (ack.cmd !== 'ACK_SET_SENSOR') return;

    const userDevice = await prisma.usersDevice.findUnique({ where: { id: ack.deviceId } });
    if (!userDevice) return;

    const key = userDevice.id;
    const store = pendingStore.get(key);

    if (store) {
      try {
        await prisma.sensorSetting.update({
          where: {
            deviceId_userId_type: {
              deviceId: store.deviceId,
              userId: store.userId,
              type: store.enumType,
            },
          },
          data: {
            minValue: store.minValue,
            maxValue: store.maxValue,
            enabled: !!store.enabled,
          },
        });

        eventBus.emitTo(`${store.userId}-sensor_ack`, {
          message: `Pengaturan berhasil disimpan dan dikonfirmasi!`,
          status: 'success',
        });
      } catch (e) {
        console.error('❌ DB ACK_SET_SENSOR failed', e);
        eventBus.emitTo(`${store.userId}-sensor_ack`, {
          message: `Server error`,
          status: 'error',
        });
      } finally {
        pendingStore.delete(key);
      }
    }

    const chatId = pendingAck.get(key);
    if (chatId && store) {
      const label = SensorLabel[ack.sensor?.type] || `Type${ack.sensor?.type}`;
      const action = store.enabled ? 'enabled' : 'disabled';
      let text;
      const deviceTitle = sanitizeMarkdown(store.deviceName);
      if (store.minValue != null && store.maxValue != null) {
        text = `✅ *${label}* pada *${deviceTitle}* diset ke ${store.minValue.toFixed(1)}–${store.maxValue.toFixed(1)}, _${action}_.`;
      } else {
        text = `✅ *${label}* pada *${deviceTitle}* telah _${action}_.`;
      }
      try {
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('❌ Telegram ACK send failed', e);
      } finally {
        pendingAck.delete(key);
      }
    }
  }

  async function sendSyncTable(deviceId) {
    const allSettings = await prisma.sensorSetting.findMany({
      where: { deviceId },
      orderBy: { id: 'asc' },
    });
    const ud = await prisma.usersDevice.findUnique({
      where: { id: deviceId },
      include: { user: true },
    });
    const chatId = ud?.user?.telegramChatId;
    const deviceName = sanitizeMarkdown(ud?.deviceName || deviceId);
    if (!chatId) return;

    const nums = allSettings.map((_, i) => `${i + 1}`);
    const labels = allSettings.map(s => s.type);
    const ranges = allSettings.map(s => `${s.minValue.toFixed(1)}–${s.maxValue.toFixed(1)}`);
    const statuses = allSettings.map(s => (s.enabled ? '✅' : '🚫'));

    const wNo = Math.max(2, ...nums.map(n => n.length));
    const wLabel = Math.max(6, ...labels.map(l => l.length));
    const wRange = Math.max(5, ...ranges.map(r => r.length));
    const wStat = 6;

    const header = ['No'.padEnd(wNo), 'Sensor'.padEnd(wLabel), 'Range'.padEnd(wRange), 'Status'.padEnd(wStat)].join(' │ ');
    const sep = ['─'.repeat(wNo), '─'.repeat(wLabel), '─'.repeat(wRange), '─'.repeat(wStat)].join('──');
    const rows = allSettings.map((s, i) => [nums[i].padEnd(wNo), labels[i].padEnd(wLabel), ranges[i].padEnd(wRange), statuses[i].padEnd(wStat)].join(' │ '));

    const msg = ['✅ *Sinkron Sensor Berhasil pada*', `*${deviceName}*`, '```', header, sep, ...rows, '```'].join('\n');
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }
}
