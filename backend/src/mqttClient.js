// initMqtt.js
import { client as mqttClient, publish as mqttPublish } from "./mqttPublisher.js";
import { PrismaClient } from "@prisma/client";
export const sensorBuffer = [];

export default function initMqtt(io) {
  const prisma = new PrismaClient();
  const TOPIC_ID = process.env.TOPIC_ID;

  const TOPIC_SENSOR = `AkhyarAzamta/sensordata/${TOPIC_ID}`;
  const TOPIC_RELAY = `AkhyarAzamta/relay/${TOPIC_ID}`;
  const TOPIC_SENSSET = `AkhyarAzamta/sensorset/${TOPIC_ID}`;
  const TOPIC_SENSACK = `AkhyarAzamta/sensorack/${TOPIC_ID}`;
  const TOPIC_ALARMSET = `AkhyarAzamta/alarmset/${TOPIC_ID}`;
  const TOPIC_ALARMACK = `AkhyarAzamta/alarmack/${TOPIC_ID}`;

  const lastProcessedTemp = new Map();

  mqttClient.on("connect", async () => {
    console.log("🔌 MQTT Connected");
    [TOPIC_ALARMSET, TOPIC_SENSSET].forEach(t => {
      mqttClient.publish(t, "", { retain: true });
    });
    await mqttClient.subscribe([
      TOPIC_SENSOR,
      TOPIC_RELAY,
      TOPIC_SENSSET,
      TOPIC_SENSACK,
      TOPIC_ALARMSET,
      TOPIC_ALARMACK
    ]);
    console.log("📨 Subscribed to topics");
  });

  mqttClient.on("message", async (topic, buf) => {
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
          enabled:  s.enabled
        }
      });
      console.log(`✅ SET_SENSOR applied (${realDeviceId}, ${enumType})`);

      // ACK sukses — kirim type sebagai angka
      mqttPublish("sensorack", {
        cmd:      "ACK_SET_SENSOR",
        from:     "BACKEND",
        deviceId,
        sensor: {
          type:     s.type,               // ini angka 0–3, bukan enum
          // minValue: updated.minValue,
          // maxValue: updated.maxValue,
          // enabled:  updated.enabled
        },
        status:  "OK",
        message: "Applied"
      }, { retain: true, qos: 1 });
    } catch (e) {
      console.error("❌ Error updating SET_SENSOR:", e);
      mqttPublish("sensorack", {
        cmd:      "ACK_SET_SENSOR",
        from:     "BACKEND",
        deviceId,
        sensor: {
          type: s.type                   // juga angka
        },
        status:  "ERROR",
        message: e.message
      }, { retain: true, qos: 1 });
    }
  }
  return;
}
   return;
    }


    // 4) ACK_SET_SENSOR dari ESP
    if (topic === TOPIC_SENSACK) {
      try {
        const ack = JSON.parse(msg);
        io.emit("ack_set_sensor", ack);
      } catch { }
      return;
    }

    // 5) Handle alarm commands from ESP
    if (topic === TOPIC_ALARMSET) {
      let req;
      try { req = JSON.parse(msg); }
      catch (e) { return console.error("❌ Invalid JSON:", e); }

      const { cmd, from, deviceId, alarm, tempIndex } = req;

      try {
        if (cmd === "REQUEST_ADD" && from === "ESP") {
          if (lastProcessedTemp.get(deviceId) === tempIndex) {
            console.log(`⏭️ Skip duplicate REQUEST_ADD dev=${deviceId} tempIndex=${tempIndex}`);
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
            cmd: "ACK_ADD",
            from: "BACKEND",
            deviceId,
            alarm: { id: created.id },
            tempIndex
          });
        }
        else if (cmd === "REQUEST_EDIT" && from === "ESP") {
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
            cmd: "ACK_EDIT",
            from: "BACKEND",
            deviceId,
            alarm: { id: alarm.id }
          });
        }
        else if (cmd === "REQUEST_DEL" && from === "ESP") {
          await prisma.alarm.delete({ where: { id: alarm.id } });
          mqttPublish("alarmack", {
            cmd: "ACK_DELETE",
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
  });

  // Socket.IO integration (unchanged)…
  io.on("connection", async socket => {
    console.log("🔗 Client connected:", socket.id);

    const history = await prisma.sensorData.findMany({
      where: { deviceId: TOPIC_ID },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    socket.emit("sensor_history", history.reverse());

    const led = await prisma.ledStatus.findUnique({ where: { deviceId: TOPIC_ID } });
    socket.emit("led_state", led?.state ? "ON" : "OFF");

    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: TOPIC_ID },
      orderBy: { type: "asc" }
    });
    socket.emit("sensor_settings", settings);

    socket.on("set_sensor", setting => {
      const req = {
        cmd: "SET_SENSOR",
        from: "BACKEND",
        deviceId: TOPIC_ID,
        sensor: { id: setting.id || 0, type: setting.type, minValue: setting.minValue, maxValue: setting.maxValue, enabled: setting.enabled }
      };
      mqttPublish("sensorset", req);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });
}
