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

  // 1) Contoh: simpan rata-rata per jam
  const sum = sensorBuffer.reduce((acc, cur) => {
    acc.temperature += cur.temperature;
    acc.tds         += cur.tds;
    acc.ph          += cur.ph;
    acc.turbidity   += cur.turbidity;
    return acc;
  }, { temperature:0, tds:0, ph:0, turbidity:0 });
  const cnt = sensorBuffer.length;

  try {
    await prisma.sensorData.create({
      data: {
        deviceId:    DEVICE_ID,
        // rata-rata:
        temperature: sum.temperature / cnt,
        tds:         sum.tds / cnt,
        ph:          sum.ph / cnt,
        turbidity:   sum.turbidity / cnt,
        // Anda bisa tambahkan field `aggregatedFrom` jika ingin tahu jumlah sampel
      }
    });
    console.log(`🕑 Flushed ${cnt} samples as hourly aggregate`);
  } catch (e) {
    console.error("❌ Gagal menyimpan aggregate:", e);
  }

  // 2) reset buffer
  sensorBuffer.length = 0;
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
