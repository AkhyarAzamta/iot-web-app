// src/main.js
import { app }       from './application/server.js';
import http          from 'http';
import { Server }    from 'socket.io';
import initMqtt      from './mqttClient.js';
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { sensorBuffer } from "./mqttClient.js";

  const DEVICE_ID     = "device2";

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

// 1) Kelompokkan entry berdasarkan userId + deviceId
  const groups = sensorBuffer.reduce((map, entry) => {
    const { userId, deviceId, temperature, tds, ph, turbidity } = entry;
    // composite key: misal "user1||deviceA"
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

// 2) Simpan per grup (user+device)
for (const { userId, deviceId, count, sum } of Object.values(groups)) {
  const avg = {
    temperature: sum.temperature / count,
    tds:         sum.tds / count,
    ph:          sum.ph / count,
    turbidity:   sum.turbidity / count,
  };

  try {
    await prisma.sensorData.create({
      data: {
        // hubungkan dulu ke user
        user: {
          connect: { id: userId }
        },
        // lalu ke device (composite unique deviceId + userId)
        device: {
          connect: {
            deviceId_userId: { deviceId, userId }
          }
        },
        // sisanya scalar fields
        ...avg
      }
    });
    console.log(`🕑 Flushed ${count} samples for ${userId}/${deviceId}`);
  } catch (e) {
    console.error(`❌ Failed for ${userId}/${deviceId}:`, e);
  }
}
  // 3) Kosongkan buffer
  sensorBuffer.length = 0;
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
