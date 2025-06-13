import mqtt from "mqtt";
import { PrismaClient } from "@prisma/client";
export const sensorBuffer = [];

export default function initMqtt(io) {
  const prisma        = new PrismaClient();
  const TOPIC_ID     = process.env.TOPIC_ID;
  const TOPIC_SENSOR  = `AkhyarAzamta/sensordata/${TOPIC_ID}`;
  const TOPIC_RELAY   = `AkhyarAzamta/relay/${TOPIC_ID}`;
  const TOPIC_SENSSET = `AkhyarAzamta/sensorset/${TOPIC_ID}`;
  const TOPIC_SENSACK = `AkhyarAzamta/sensorack/${TOPIC_ID}`;
  const TOPIC_ALARMSET = `AkhyarAzamta/alarmset/${TOPIC_ID}`;
  const TOPIC_ALARMACK = `AkhyarAzamta/alarmack/${TOPIC_ID}`;

  const client = mqtt.connect("mqtt://broker.hivemq.com:1883");

  client.on("connect", async () => {
    console.log("🔌 MQTT Connected");
    await client.subscribe([TOPIC_SENSOR, TOPIC_RELAY, TOPIC_SENSSET, TOPIC_SENSACK, TOPIC_ALARMSET, TOPIC_ALARMACK]);
    console.log("📨 Subscribed to topics");

    // Kirim ulang status LED terakhir (retained), tapi catch jika device belum ada
    // try {
    //   const led = await prisma.ledStatus.findUnique({ where: { deviceId: TOPIC_ID }});
    //   const state = led?.state ? "ON" : "OFF";
    //   client.publish(TOPIC_RELAY, state, { retain: true });
    // } catch (e) {
    //   console.warn("⚠️ Gagal fetch LedStatus (mungkin device belum terdaftar):", e.code);
    // }
  });

  client.on("message", async (topic, buf) => {
    const msg = buf.toString();

    // 1) Data sensor baru
    if (topic === TOPIC_SENSOR) {
      let data;
      try {
        data = JSON.parse(msg);
        console.log(data);
      } catch (e) {
        console.error("❌ Invalid JSON:", e);
        return;
      }
      try {
    sensorBuffer.push({
      timestamp: new Date(),
      ...data
    });
    // optional: kirim ke UI 
    io.emit("sensor_data", data);
        // console.log("✅ SensorData saved");
      } catch (e) {
        // misal: FK violation karena device belum ada
        if (e.code === 'P2003') {
          console.warn("⚠️ SensorData skipped: deviceId belum terdaftar");
        } else {
          console.error("❌ Error saving SensorData:", e);
        }
      }
      io.emit("sensor_data", data);
    }

    // 2) LED control dari ESP
    // else if (topic === TOPIC_RELAY) {
    //   const newState = msg === "ON";
    //   try {
    //       await prisma.ledStatus.upsert({
    //         where: {
    //           // gunakan nama compound-unique yang Prisma generate:
    //           deviceId_userId: {
    //             deviceId,
    //             userId
    //           }
    //         },
    //         create: {
    //           deviceId,
    //           userId,
    //           state: newState
    //         },
    //         update: {
    //           state: newState
    //         }
    //       });
    //     console.log("✅ LedStatus upserted:", newState);
    //   } catch (e) {
    //     if (e.code === 'P2003') {
    //       console.warn("⚠️ LedStatus skipped: deviceId belum terdaftar");
    //     } else {
    //       console.error("❌ Error upserting LedStatus:", e);
    //     }
    //   }
    //   io.emit("led_state", msg);
    // }

    // 3) SET_SENSOR dari backend
    else if (topic === TOPIC_SENSSET) {
      let req;
      try {
        req = JSON.parse(msg);
      } catch (e) {
        console.error("❌ Invalid SET_SENSOR JSON:", e);
        console.log(req);
        return;
      }
      const s = req.sensor;
      try {
        await prisma.sensorSetting.upsert({
          where: { deviceId_type: { deviceId: s.deviceId, type: s.type } },
          update: {
            minValue: s.minValue,
            maxValue: s.maxValue,
            enabled:  s.enabled,
          },
          create: {
            deviceId: s.deviceId,
            type:     s.type,
            minValue: s.minValue,
            maxValue: s.maxValue,
            enabled:  s.enabled,
          }
        });
        console.log("✅ SensorSetting upserted");
      } catch (e) {
        if (e.code === 'P2003') {
          console.warn("⚠️ SensorSetting skipped: deviceId belum terdaftar");
        } else {
          console.error("❌ Error upserting SensorSetting:", e);
        }
      }

      // terus forward ke ESP
      client.publish(TOPIC_SENSSET, msg);
    }

    // 4) ACK_SET_SENSOR dari ESP
    else if (topic === TOPIC_SENSACK) {
      let ack;
      try {
        ack = JSON.parse(msg);
        io.emit("ack_set_sensor", ack);
      } catch {
        // abaikan
      }
    }

      if (topic === TOPIC_ALARMSET) {
    let req;
    try {
      req = JSON.parse(msg);
    } catch (e) {
      console.error("❌ Invalid JSON:", e);
      return;
    }

    const { cmd, deviceId, alarm, tempIndex } = req;
    // alarm: { id?, hour, minute, duration, enabled }

    try {
      if (cmd === "REQUEST_ADD") {
        // 1) insert di DB
        const created = await prisma.alarm.create({
          data: {
            deviceId: deviceId,
            hour:      alarm.hour,
            minute:    alarm.minute,
            duration:  alarm.duration,
            enabled:   alarm.enabled,
            lastDayTrig: alarm.lastDayTrig,
            lastMinTrig: alarm.lastMinTrig
          }
        });
        // 2) kirim ACK_ADD
        const ack = {
          cmd:       "ACK_ADD",
          from:      "BACKEND",
          alarm:     { id: created.id },
          tempIndex: tempIndex
        };
        client.publish(TOPIC_ALARMACK, JSON.stringify(ack));
      }
      else if (cmd === "REQUEST_EDIT") {
        // update existing
        await prisma.alarm.update({
          where: { id: alarm.id },
          data: {
            hour:     alarm.hour,
            minute:   alarm.minute,
            duration: alarm.duration,
            enabled:  alarm.enabled,
            lastDayTrig: alarm.lastDayTrig,
            lastMinTrig: alarm.lastMinTrig
          }
        });
        const ack = {
          cmd:   "ACK_EDIT",
          from:  "BACKEND",
          alarm: { id: alarm.id }
        };
        client.publish(TOPIC_ALARMACK, JSON.stringify(ack));
      }
      else if (cmd === "REQUEST_DEL") {
        // delete
        await prisma.alarm.delete({ where: { id: alarm.id } });
        const ack = {
          cmd:   "ACK_DELETE",
          from:  "BACKEND",
          alarm: { id: alarm.id }
        };
        client.publish(TOPIC_ALARMACK, JSON.stringify(ack));
      }
      else {
        // ignore
      }
    } catch (e) {
      console.error("❌ Error handling alarm command:", cmd, e);
      // opsional: kirim NACK
    }
  }
  });

  // … (Socket.IO integration tetap sama)

  // Socket.IO integration
  io.on("connection", async socket => {
    console.log("🔗 Client connected:", socket.id);

    // Kirim history sensor (misal 10 data terakhir)
    const history = await prisma.sensorData.findMany({
      where: { deviceId: TOPIC_ID },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    socket.emit("sensor_history", history.reverse());

    // Kirim current LED state
    const led = await prisma.ledStatus.findUnique({ where: { deviceId: TOPIC_ID }});
    socket.emit("led_state", led?.state ? "ON" : "OFF");

    // Kirim current SensorSetting list
    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: TOPIC_ID },
      orderBy: { type: "asc" }
    });
    socket.emit("sensor_settings", settings);

    // Jika UI klik Save Settings:
    socket.on("set_sensor", setting => {
      // setting = { type, minValue, maxValue, enabled }
      const req = {
        cmd:    "SET_SENSOR",
        from:   "BACKEND",
        sensor: {
          id:        setting.id || 0,
          type:      setting.type,
          minValue:  setting.minValue,
          maxValue:  setting.maxValue,
          enabled:   setting.enabled
        }
      };
      client.publish(TOPIC_SENSSET, JSON.stringify(req));
      console.log("← SET_SENSOR from UI:", req);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });
}
