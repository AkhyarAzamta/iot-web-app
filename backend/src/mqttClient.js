import mqtt from "mqtt";
import { PrismaClient } from "@prisma/client";

export default function initMqtt(io) {
  const prisma = new PrismaClient();
  const DEVICE_ID    = "device1";
  const TOPIC_SENSOR = `akhyarazamta/sensordata/${DEVICE_ID}`;
  const TOPIC_LED    = `led/control/${DEVICE_ID}`;
  const client       = mqtt.connect("mqtt://broker.hivemq.com:1883");

  client.on("connect", async () => {
    console.log("🔌 MQTT Connected");
    await client.subscribe([TOPIC_SENSOR, TOPIC_LED]);
    console.log("📨 Subscribed to", TOPIC_SENSOR, "and", TOPIC_LED);

    // kirim status LED terakhir
    const led = await prisma.ledStatus.findUnique({ where: { deviceId: DEVICE_ID } });
    const last = led?.state ? "ON" : "OFF";
    console.log("♻️  Re-publishing last LED state:", last);
    client.publish(TOPIC_LED, last, { retain: true });
  });

  client.on("message", async (topic, buf) => {
    const msg = buf.toString();
    if (topic === TOPIC_SENSOR) {
      console.log("🌡️ MQTT → sensor_data:", msg);
      let data;
      try { data = JSON.parse(msg); }
      catch (e) {
        console.error("❌ Invalid JSON:", e);
        return;
      }
      // simpan & emit
      await prisma.sensorData.create({
        data: { deviceId: DEVICE_ID, temperature: data.temperature, humidity: data.humidity }
      });
      console.log("✅ Sensor saved");
      io.emit("sensor_data", data);
    }

    if (topic === TOPIC_LED) {
      console.log("💡 MQTT → led_control:", msg);
      const stateBool = msg === "ON";
      await prisma.ledStatus.upsert({
        where: { deviceId: DEVICE_ID },
        update: { state: stateBool },
        create: { deviceId: DEVICE_ID, state: stateBool }
      });
      console.log("✅ LED status DB updated:", stateBool);
      io.emit("led_state", msg);
    }
  });

  io.on("connection", async (socket) => {
    console.log("🔗 Socket.IO client connected:", socket.id);

    // kirim status LED langsung ketika client connect
    const led = await prisma.ledStatus.findUnique({ where: { deviceId: DEVICE_ID } });
    const initState = led?.state ? "ON" : "OFF";
    console.log("  → send init led_state:", initState);
    socket.emit("led_state", initState);

    // UI → MQTT
    socket.on("led_control", (state) => {
      const payload = state ? "ON" : "OFF";
      console.log("  ← led_control from UI:", payload);
      client.publish(TOPIC_LED, payload, { retain: true });
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket.IO client disconnected:", socket.id);
    });
  });
}
