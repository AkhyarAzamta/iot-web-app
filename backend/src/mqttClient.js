// initMqtt.js
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

export default function initMqtt(io) {
  const prisma = new PrismaClient();

  const lastProcessedTemp = new Map();

  mqttClient.on("message", async (topic, buf, packet) => {
    const msg = buf.toString();

    // 1) Data sensor baru
    if (topic === TOPIC_SENSOR) {
      let data;
      try { data = JSON.parse(msg); }
      catch (e) { return console.error("❌ Invalid JSON:", e); }

      try {
        const userDevice = await prisma.usersDevice.findFirst({ where: { id: data.deviceId } });
        if (!userDevice) {
          console.warn(`⚠️ SensorData skipped: device ${data.deviceId} belum terdaftar`);
          return;
        }
        sensorBuffer.push({
          timestamp: new Date(),
          userId: userDevice.userId,
          deviceId: userDevice.deviceId,
          temperature: data.temperature,
          turbidity: data.turbidity,
          tds: data.tds,
          ph: data.ph
        });
        io.emit("sensor_data", data);
        await notifyOutOfRange(data.deviceId, data);
      } catch (e) {
        console.error("❌ Error buffering SensorData:", e);
      }
      return;
    }

    // 3) SET_SENSOR dari backend
    if (topic === TOPIC_SENSSET) {
      let req;
      try {
        req = JSON.parse(msg);
      } catch (e) {
        return console.error("❌ Invalid SET_SENSOR JSON:", e);
      }

      const { cmd, from, deviceId } = req;
      // wrap single‐object into an array
      const sensorPayload = req.sensor;
      const sensors = Array.isArray(sensorPayload)
        ? sensorPayload
        : [sensorPayload];

      // Lookup UsersDevice by UUID
      const userDevice = await prisma.usersDevice.findUnique({
        where: { id: deviceId }
      });
      if (!userDevice) {
        console.warn(`⚠️ Device UUID ${deviceId} belum terdaftar`);
        return;
      }
      const realDeviceId = userDevice.deviceId; // e.g. "Kolam 1"
      const userId = userDevice.userId;
      const typeMap = { 0: "TEMPERATURE", 1: "TURBIDITY", 2: "TDS", 3: "PH" };

      if (cmd === "INIT_SENSOR") {
        for (const s of sensors) {
          try {
            const enumType = typeMap[s.type];
            // cek apakah sudah ada
            const exists = await prisma.sensorSetting.findFirst({
              where: {
                deviceId: realDeviceId,
                userId,
                type: enumType
              }
            });
            if (exists) {
              // sudah ter‐set sebelumnya, skip
              console.log(`ℹ️ SensorSetting already exists (device="${realDeviceId}", type=${enumType}), skipping INIT`);
              continue;
            }
            // baru: insert saja
            await prisma.sensorSetting.create({
              data: {
                deviceId: realDeviceId,
                userId,
                type: enumType,
                minValue: s.minValue,
                maxValue: s.maxValue,
                enabled: s.enabled
              }
            });
            console.log(`✅ SensorSetting created (device="${realDeviceId}", type=${enumType})`);
          } catch (e) {
            console.error("❌ Error handling INIT_SENSOR entry:", e);
          }
        }
      }

      else if (cmd === "SET_SENSOR" && from === "ESP") {
        // handle single-sensor updates
        for (const s of sensors) {
          const enumType = typeMap[s.type];
          if (!enumType) {
            console.error(`❌ Unknown sensor type code ${s.type}`);
            continue;
          }
          try {
            const updated = await prisma.sensorSetting.update({
              where: {
                deviceId_userId_type: {
                  deviceId: realDeviceId,
                  userId,
                  type: enumType
                }
              },
              data: {
                minValue: s.minValue,
                maxValue: s.maxValue,
                enabled: s.enabled
              }
            });
            console.log(`✅ SET_SENSOR applied (${realDeviceId}, ${enumType})`);
            // 2) Notify user via Telegram
            //    Fetch user's chatId and send a friendly message
            const user = await prisma.users.findUnique({ where: { id: userId } });
            if (user?.telegramChatId) {
              const chatId = user.telegramChatId;
              const text =
                `Device: ${realDeviceId}\n` +
                `✅ ${enumType} pada ${realDeviceId} diset dari perangkat ke ` +
                `${updated.minValue}–${updated.maxValue}, ${updated.enabled ? 'enabled' : 'disabled'}.`;
              await bot.sendMessage(chatId, text);
            }
          } catch (e) {
            console.error("❌ Error updating SET_SENSOR:", e);
          }
        }
        return;
      }
      return;
    }

    // … inside mqttClient.on('message', async (topic, buf, packet) => { …

    // 4) ACK_SET_SENSOR from ESP
    if (topic === TOPIC_SENSACK) {
      // ignore retained messages
      if (packet.retain) return;

      let ack;
      try {
        ack = JSON.parse(buf.toString());
      } catch {
        return console.error("❌ Invalid JSON in SENSACK");
      }
      if (ack.cmd !== "ACK_SET_SENSOR" || ack.from !== "ESP") return;

      const key = `${ack.deviceId}-${ack.sensor.type}`;

      // 1) If we queued a store for this key, update the DB now
      const store = pendingStore.get(key);
      if (store) {
        try {
          await prisma.sensorSetting.update({
            where: {
              deviceId_userId_type: {
                deviceId: store.realDeviceId,
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
        } catch (dbErr) {
          console.error("❌ Failed to persist ACK_SET_SENSOR to DB:", dbErr);
        }
        // remove the queued store
        pendingStore.delete(key);
      }

      // 2) If it came from a Telegram command, send the chat reply
      const chatId = pendingAck.get(key);
      if (chatId) {
        // Build label and action
        const label = SensorLabel[ack.sensor.type] || `Type${ack.sensor.type}`;
        const action = store.enabled ? "enabled" : "disabled";

        // If min/max were in the store, include the range in the message
        const text = (store.minValue != null)
          ? `✅ *${label}* pada *${store.realDeviceId}* diset ke ${store.minValue}–${store.maxValue}, _${action}_.`
          : `✅ *${label}* pada *${store.realDeviceId}* telah _${action}_.`;

        try {
          await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        } catch (tgErr) {
          console.error("❌ Failed to send Telegram ACK message:", tgErr);
        }

        // cleanup the pending ACK
        pendingAck.delete(key);
      }

      return;
    }

    // 5) Handle alarm commands from ESP
    if (topic === TOPIC_ALARMSET) {
      let req;
      try { req = JSON.parse(msg); }
      catch (e) { return console.error("❌ Invalid JSON:", e); }

      const { cmd, from, deviceId, alarm, tempIndex } = req;

      try {
        if (cmd === "REQUEST_ADD_ALARM" && from === "ESP") {
          if (lastProcessedTemp.get(deviceId) === tempIndex) {
            console.log(`⏭️ Skip duplicate REQUEST_ADD_ALARM dev=${deviceId} tempIndex=${tempIndex}`);
            return;
          }
          lastProcessedTemp.set(deviceId, tempIndex);

          const created = await prisma.alarm.create({
            data: {
              deviceId,
              hour: alarm.hour,
              minute: alarm.minute,
              duration: alarm.duration,
              enabled: alarm.enabled
            }
          });

          mqttPublish("alarmack", {
            cmd: "ACK_ADD_ALARM",
            from: "BACKEND",
            deviceId,
            alarm: { id: created.id },
            tempIndex
          });
        }
        else if (cmd === "REQUEST_EDIT_ALARM" && from === "ESP") {
          await prisma.alarm.update({
            where: { id: alarm.id },
            data: {
              hour: alarm.hour,
              minute: alarm.minute,
              duration: alarm.duration,
              enabled: alarm.enabled
            }
          });
          mqttPublish("alarmack", {
            cmd: "ACK_EDIT_ALARM",
            from: "BACKEND",
            deviceId,
            alarm: { id: alarm.id }
          });
        }
        else if (cmd === "REQUEST_DELETE_ALARM" && from === "ESP") {
          await prisma.alarm.delete({ where: { id: alarm.id } });
          mqttPublish("alarmack", {
            cmd: "ACK_DELETE_ALARM",
            from: "BACKEND",
            deviceId,
            alarm: { id: alarm.id }
          });
        }
      } catch (e) {
        console.error("❌ Error handling alarm command:", cmd, e);
      }

      return;
    }

    // 9) ACK alarm dari ESP
// 9) ACK alarm dari ESP
if (topic === TOPIC_ALARMACK) {
  if (packet.retain) return;
  let ack;
  try {
    ack = JSON.parse(buf.toString());
  } catch {
    return;
  }
  if (ack.from !== 'ESP') return;

  const { cmd, deviceId, alarm, status } = ack;
  let key;
  if (cmd === 'ACK_ADD_ALARM') key = `${deviceId}-ADD-${alarm.id}`;
  else if (cmd === 'ACK_EDIT_ALARM') key = `${deviceId}-EDIT-${alarm.id}`;
  else if (cmd === 'ACK_DELETE_ALARM') key = `${deviceId}-DEL-${alarm.id}`;
  else if (cmd === 'ACK_ENABLE_ALARM') key = `${deviceId}-ENABLE-${alarm.id}`;
  else if (cmd === 'ACK_DISABLE_ALARM') key = `${deviceId}-DISABLE-${alarm.id}`;
  else return;

  const chatId = pendingAlarmAck.get(key);
  const store = pendingAlarmStore.get(key);

  // Commit to DB
  try {
    if (cmd === 'ACK_EDIT_ALARM' && store) {
      await prisma.alarm.update({
        where: { id: alarm.id },
        data: store
      });
    } else if (cmd === 'ACK_DELETE_ALARM') {
      await prisma.alarm.delete({ where: { id: alarm.id } });
    } else if (cmd === 'ACK_ENABLE_ALARM') {
      await prisma.alarm.update({ where: { id: alarm.id }, data: { enabled: true } });
    } else if (cmd === 'ACK_DISABLE_ALARM') {
      await prisma.alarm.update({ where: { id: alarm.id }, data: { enabled: false } });
    }
    // Untuk ADD, record sudah dibuat di /alarm_add
  } catch (e) {
    console.error('DB alarm commit failed', e);
  }

  // Reply to Telegram
  if (chatId) {
    let msg;

    if (cmd === 'ACK_ADD_ALARM' && status === 'OK') {
      // ambil data alarm dan nama device dari DB
      const rec = await prisma.alarm.findUnique({ where: { id: alarm.id } });
      const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
      const deviceName = ud?.deviceId || deviceId;
      msg = `<b>✅ Alarm baru dibuat pada ${esc(deviceName)}</b>\n` +
            `⏰ Jam: <code>${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}</code>\n` +
            `⏱ Durasi: <code>${rec.duration}s</code>`;
    } else if (cmd === 'ACK_EDIT_ALARM' && status === 'OK') {
      // ambil data alarm dan nama device
      const rec = await prisma.alarm.findUnique({ where: { id: alarm.id } });
      const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
      const deviceName = ud?.deviceId || deviceId;
      msg = `✅ <b>Edit Alarm berhasil pada ${esc(deviceName)}</b>\n` +
            `⏰ Jam: <code>${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}</code>\n` +
            `⏱ Durasi: <code>${rec.duration}s</code>`;
    } else {
      // fallback simple message untuk DELETE/ENABLE/DISABLE
      const idxList = lastAlarmList.get(`${chatId}-${deviceId}`) || [];
      const idx = idxList.indexOf(alarm.id) + 1;
      const action = cmd.replace(/^ACK_/, '').split('_')[0].toLowerCase();
      msg = `✅ <b>Alarm #${idx} berhasil di-${action}.</b>`;
    }

    await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    pendingAlarmAck.delete(key);
    pendingAlarmStore.delete(key);
  }

  return;
}


  });

  // Socket.IO integration (unchanged)…
  io.on("connection", async socket => {
    console.log("🔗 Client connected:", socket.id);

    const history = await prisma.sensorData.findMany({
      where: { deviceId: "TOPIC_ID" },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    socket.emit("sensor_history", history.reverse());

    const led = await prisma.ledStatus.findUnique({ where: { deviceId: "TOPIC_ID" } });
    socket.emit("led_state", led?.state ? "ON" : "OFF");

    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: "TOPIC_ID" },
      orderBy: { type: "asc" }
    });
    socket.emit("sensor_settings", settings);

    socket.on("set_sensor", setting => {
      const req = {
        cmd: "SET_SENSOR",
        from: "BACKEND",
        deviceId: "TOPIC_ID",
        sensor: { id: setting.id || 0, type: setting.type, minValue: setting.minValue, maxValue: setting.maxValue, enabled: setting.enabled }
      };
      mqttPublish("sensorset", req);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });
}
