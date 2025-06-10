import mqtt from "mqtt";
import { PrismaClient } from "@prisma/client";

export default function initMqtt(io) {
  const prisma        = new PrismaClient();
  const DEVICE_ID     = "device2";
  const TOPIC_SENSOR  = `1/sensordata/${DEVICE_ID}`;
  const TOPIC_RELAY   = `1/relay/${DEVICE_ID}`;
  const TOPIC_SENSSET = `1/sensorset/${DEVICE_ID}`;
  const TOPIC_SENSACK = `1/sensorack/${DEVICE_ID}`;

  const client = mqtt.connect("mqtt://broker.hivemq.com:1883");

  client.on("connect", async () => {
    console.log("🔌 MQTT Connected");
    await client.subscribe([TOPIC_SENSOR, TOPIC_RELAY, TOPIC_SENSSET, TOPIC_SENSACK]);
    console.log("📨 Subscribed to topics");

    // Kirim ulang status LED terakhir (retained), tapi catch jika device belum ada
    try {
      const led = await prisma.ledStatus.findUnique({ where: { deviceId: DEVICE_ID }});
      const state = led?.state ? "ON" : "OFF";
      client.publish(TOPIC_RELAY, state, { retain: true });
    } catch (e) {
      console.warn("⚠️ Gagal fetch LedStatus (mungkin device belum terdaftar):", e.code);
    }
  });

  client.on("message", async (topic, buf) => {
    const msg = buf.toString();

    // 1) Data sensor baru
    if (topic === TOPIC_SENSOR) {
      let data;
      try {
        data = JSON.parse(msg);
      } catch (e) {
        console.error("❌ Invalid JSON:", e);
        return;
      }
      try {
        await prisma.sensorData.create({
          data: {
            deviceId:    DEVICE_ID,
            temperature: data.temperature,
            turbidity:   data.turbidity,
            tds:         data.tds,
            ph:          data.ph,
          }
        });
        console.log("✅ SensorData saved");
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
    else if (topic === TOPIC_RELAY) {
      const newState = msg === "ON";
      try {
        await prisma.ledStatus.upsert({
          where:  { deviceId: DEVICE_ID },
          update: { state: newState },
          create: { deviceId: DEVICE_ID, state: newState }
        });
        console.log("✅ LedStatus upserted:", newState);
      } catch (e) {
        if (e.code === 'P2003') {
          console.warn("⚠️ LedStatus skipped: deviceId belum terdaftar");
        } else {
          console.error("❌ Error upserting LedStatus:", e);
        }
      }
      io.emit("led_state", msg);
    }

    // 3) SET_SENSOR dari backend
    else if (topic === TOPIC_SENSSET) {
      let req;
      try {
        req = JSON.parse(msg);
      } catch (e) {
        console.error("❌ Invalid SET_SENSOR JSON:", e);
        return;
      }
      const s = req.sensor;
      try {
        await prisma.sensorSetting.upsert({
          where: { deviceId_type: { deviceId: DEVICE_ID, type: s.type } },
          update: {
            minValue: s.minValue,
            maxValue: s.maxValue,
            enabled:  s.enabled,
          },
          create: {
            deviceId: DEVICE_ID,
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
  });

  // … (Socket.IO integration tetap sama)

  // Socket.IO integration
  io.on("connection", async socket => {
    console.log("🔗 Client connected:", socket.id);

    // Kirim history sensor (misal 10 data terakhir)
    const history = await prisma.sensorData.findMany({
      where: { deviceId: DEVICE_ID },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    socket.emit("sensor_history", history.reverse());

    // Kirim current LED state
    const led = await prisma.ledStatus.findUnique({ where: { deviceId: DEVICE_ID }});
    socket.emit("led_state", led?.state ? "ON" : "OFF");

    // Kirim current SensorSetting list
    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: DEVICE_ID },
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
