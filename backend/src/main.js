// src/main.js
import { app }       from './application/server.js';
import http          from 'http';
import { Server }    from 'socket.io';
import initMqtt      from './mqttClient.js';
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { sensorBuffer } from "./mqttClient.js";

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
    credentials: true
  }
});


// inisialisasi MQTT ↔ Socket bridge
initMqtt(io);
io.on('connection', socket => {
  console.log("🔥 New client connected:", socket.id);
});

// flushBuffer akan dipanggil tiap jam tepat menit 0
cron.schedule("*/1 * * * *", async () => {
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

  await Promise.all(entries.map(async ({ userId, deviceId, count, sum }) => {
    const avg = {
      temperature: sum.temperature / count,
      tds:         sum.tds / count,
      ph:          sum.ph / count,
      turbidity:   sum.turbidity / count,
    };

    try {
      await prisma.sensorData.create({
        data: {
          ...avg,
          // nested connect untuk relasi Users
          user: {
            connect: { id: userId }
          },
          // nested connect untuk relasi UsersDevice (compound key)
          device: {
            connect: {
              deviceId_userId: { deviceId, userId }
            }
          }
        }
      });
      console.log(`🕑 Flushed ${count} samples for ${userId}/${deviceId}`);
    } catch (e) {
      console.error(`❌ Failed for ${userId}/${deviceId}:`, e.message || e);
    }
  }));

  console.timeEnd("cron_job");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
