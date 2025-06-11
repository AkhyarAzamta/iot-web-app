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

  // 1) Kelompokkan entry berdasarkan deviceId
  const groups = sensorBuffer.reduce((map, entry) => {
    const { deviceId, temperature, tds, ph, turbidity } = entry;
    if (!map[deviceId]) {
      map[deviceId] = { count: 0, sum: { temperature: 0, tds: 0, ph: 0, turbidity: 0 } };
    }
    const grp = map[deviceId];
    grp.count++;
    grp.sum.temperature += temperature;
    grp.sum.tds         += tds;
    grp.sum.ph          += ph;
    grp.sum.turbidity   += turbidity;
    return map;
  }, {});

  // 2) Untuk setiap deviceId, hitung rata-rata dan simpan
  for (const [deviceId, { count, sum }] of Object.entries(groups)) {
    const avg = {
      temperature: sum.temperature / count,
      tds:         sum.tds / count,
      ph:          sum.ph / count,
      turbidity:   sum.turbidity / count,
    };

    try {
      await prisma.sensorData.create({
        data: {
          deviceId,
          ...avg
        }
      });
      console.log(`🕑 Flushed ${count} samples for device ${deviceId}`);
    } catch (e) {
      console.error(`❌ Failed to save aggregate for ${deviceId}:`, e);
    }
  }

  // 3) Kosongkan buffer
  sensorBuffer.length = 0;
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
