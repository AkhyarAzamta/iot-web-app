# IoT Web App

## Struktur
- `frontend/` : Next.js dashboard (MQTT + Socket.IO)
- `backend/`  : Node.js ESP8266 MQTT bridge

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env sesuai
npm run dev
