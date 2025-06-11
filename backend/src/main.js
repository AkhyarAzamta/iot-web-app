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

  // 1) Pindahkan dan kosongkan buffer dulu (biar gak keisi sambil proses)
  const tempBuffer = [...sensorBuffer];
  sensorBuffer.length = 0;

  // 2) Kelompokkan berdasarkan userId + deviceId
  const groups = tempBuffer.reduce((map, entry) => {
    const { userId, deviceId, temperature, tds, ph, turbidity } = entry;
    const key = `${userId}||${deviceId}`;
    if (!map[key]) {
      map[key] = {
        userId,
        deviceId,
        count: 0,
        sum: { temperature: 0, tds: 0, ph: 0, turbidity: 0 }
      };
    }
    const g = map[key];
    g.count++;
    g.sum.temperature += temperature;
    g.sum.tds         += tds;
    g.sum.ph          += ph;
    g.sum.turbidity   += turbidity;
    return map;
  }, {});

  // 3) Ambil maksimal 100 grup dulu
  const groupEntries = Object.values(groups).slice(0, 100);

  // 4) Proses paralel semua entry
  await Promise.all(groupEntries.map(async ({ userId, deviceId, count, sum }) => {
    const avg = {
      temperature: sum.temperature / count,
      tds:         sum.tds / count,
      ph:          sum.ph / count,
      turbidity:   sum.turbidity / count,
    };

    try {
      await prisma.sensorData.create({
        data: {
          user: {
            connect: { id: userId }
          },
          device: {
            connect: {
              deviceId_userId: { deviceId, userId }
            }
          },
          ...avg
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
