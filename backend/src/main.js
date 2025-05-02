// src/main.js
import { app }       from './application/server.js';
import http          from 'http';
import { Server }    from 'socket.io';
import initMqtt      from './mqttClient.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (origin === process.env.FRONTEND || !origin) {
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
