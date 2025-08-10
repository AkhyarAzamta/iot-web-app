import { app }       from './src/application/server.js';
import http          from 'http';
import { Server }    from 'socket.io';
import initMqtt      from './src/mqttClient.js';
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { sensorBuffer } from "./src/mqttClient.js";

const prisma = new PrismaClient();
const server = http.createServer(app);
const allowedOrigins = process.env.FRONTENDS.split(',');
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});
// init MQTT ↔ Socket bridge
initMqtt(io);
io.on('connection', socket => {
  // console.log("🔥 New client connected:", socket.id);
});

// flushBuffer akan dipanggil tiap menit
cron.schedule("*/1 * * * *", () => {
  setImmediate(async () => {
    await flushSensorBuffer();
  });
});
const flushSensorBuffer = async () => {
  if (sensorBuffer.length === 0) return;
  console.time("cron_job");

  const temp = [...sensorBuffer];
  sensorBuffer.length = 0;

  // Kelompokkan & hitung rata‑rata
  const groups = temp.reduce((m, e) => {
    const key = `${e.userId}||${e.deviceId}`;
    if (!m[key]) m[key] = { ...e, count: 0, sum: { temperature:0, tds:0, ph:0, turbidity:0 } };
    m[key].count++;
    m[key].sum.temperature += e.temperature;
    m[key].sum.tds         += e.tds;
    m[key].sum.ph          += e.ph;
    m[key].sum.turbidity   += e.turbidity;
    return m;
  }, {});

  const entries = Object.values(groups).slice(0, 100);

  await Promise.all(entries.map(async ({ userId, deviceId, deviceName, count, sum }) => {
    const avg = {
      temperature: sum.temperature / count,
      tds:         sum.tds / count,
      ph:          sum.ph / count,
      turbidity:   sum.turbidity / count,
    };

try {
  const ud = await prisma.usersDevice.findFirst({
    where: { userId, id: deviceId },
  });

  if (!ud) {
    console.warn(`⚠️ Skipped flush: UsersDevice not found for ${userId}/${deviceName}`);
    return;
  }

  await prisma.sensorData.create({
    data: {
      ...avg,
      userId,
      deviceId,
      createdAt: new Date(),
    },
  });

  await prisma.usersDevice.update({
    where: { id: deviceId },
    data: { active: true },
  });

  console.log(`🕑 Flushed ${count} samples for ${userId}/${deviceId}`);
} catch (e) {
  if (e.code === "P2024") {
    console.error("⏳ Connection pool timeout. Consider increasing limit or optimizing queries.");
  } else {
    console.error(`❌ Failed for ${userId}/${deviceId}:`, e.message || e);
  }
}

  }));

  console.timeEnd("cron_job");
};

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
