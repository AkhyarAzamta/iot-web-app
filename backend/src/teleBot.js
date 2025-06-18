// telebot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './application/database.js';
import { publish as mqttPublish } from './mqttPublisher.js';

// Mapping Prisma enum → kode numerik untuk ESP
const SensorTypeMap = {
  TEMPERATURE: 0,
  TURBIDITY:   1,
  TDS:         2,
  PH:          3,
};

const SENSOR_TYPES = [
  { key: 'temperature', label: 'Temperature', type: 'TEMPERATURE' },
  { key: 'turbidity',   label: 'Turbidity',   type: 'TURBIDITY'   },
  { key: 'tds',         label: 'TDS',         type: 'TDS'         },
  { key: 'ph',          label: 'pH',          type: 'PH'          },
];

// state alert agar tidak spam
const alertState = new Map();

const token = process.env.TELEGRAM_TOKEN;
export const bot = new TelegramBot(token, { polling: true });

// Helper: cari user & device by telegramChatId + deviceName
async function findUserAndDevice(chatId, deviceName) {
  const user = await prisma.users.findFirst({
    where: { telegramChatId: String(chatId) }
  });
  if (!user) throw new Error('Anda belum terdaftar di sistem.');
  const ud = await prisma.usersDevice.findFirst({
    where: { userId: user.id, deviceId: deviceName }
  });
  if (!ud) throw new Error(`Device "${deviceName}" tidak ditemukan untuk Anda.`);
  return { user, ud };
}

// 1) Notify out‐of‐range / back‐to‐normal
export async function notifyOutOfRange(deviceUuid, data) {
  const ud = await prisma.usersDevice.findUnique({
    where:   { id: deviceUuid },
    include: { user: true }
  });
  if (!ud || !ud.user.telegramChatId) return;
  const chatId = ud.user.telegramChatId;
  const name   = ud.deviceId;

  for (const { key, label, type } of SENSOR_TYPES) {
    const val = data[key];
    const s = await prisma.sensorSetting.findFirst({
      where: { deviceId: ud.deviceId, userId: ud.userId, type }
    });
    if (!s || !s.enabled) {
      alertState.delete(`${deviceUuid}-${type}`);
      continue;
    }

    const isOut  = val < s.minValue || val > s.maxValue;
    const mapKey = `${deviceUuid}-${type}`;
    const wasOut = alertState.get(mapKey) || false;

    if (isOut && !wasOut) {
      const text =
        `Device: *${name}*\n` +
        `⚠️ *${label}* \`${val.toFixed(2)}\` di luar batas [\`${s.minValue.toFixed(2)}\` – \`${s.maxValue.toFixed(2)}\`]`;
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      alertState.set(mapKey, true);
    }
    else if (!isOut && wasOut) {
      const text =
        `Device: *${name}*\n` +
        `✅ *${label}* \`${val.toFixed(2)}\` sudah normal kembali [\`${s.minValue.toFixed(2)}\` – \`${s.maxValue.toFixed(2)}\`]`;
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      alertState.set(mapKey, false);
    }
  }
}

// 2) /set <DeviceName> <type> <min> <max>
bot.onText(
  /^\/set\s+(?:"([^"]+)"|(\S+))\s+(\w+)\s+([\d.]+)\s+([\d.]+)/i,
  async (msg, match) => {
    const chatId    = msg.chat.id;
    const deviceName = match[1] || match[2];
    const rawType    = match[3].toUpperCase();
    const minV       = parseFloat(match[4]);
    const maxV       = parseFloat(match[5]);
    const typeCode   = SensorTypeMap[rawType];

    if (typeCode === undefined) {
      return bot.sendMessage(chatId, `❌ Tipe sensor "${rawType}" tidak dikenal.`);
    }

    try {
      const { user, ud } = await findUserAndDevice(chatId, deviceName);

      const setting = await prisma.sensorSetting.upsert({
        where: {
          deviceId_userId_type: {
            deviceId: ud.deviceId,
            userId:   user.id,
            type:     rawType
          }
        },
        create: {
          deviceId: ud.deviceId,
          userId:   user.id,
          type:     rawType,
          minValue: minV,
          maxValue: maxV,
          enabled:  true
        },
        update: { minValue: minV, maxValue: maxV }
      });

      // MQTT publish RETAIN
      mqttPublish(
        'sensorset',
        {
          cmd:      'SET_SENSOR',
          from:     'BACKEND',
          deviceId: ud.id,
          sensor: {
            type:      typeCode,
            minValue:  setting.minValue,
            maxValue:  setting.maxValue,
            enabled:   setting.enabled
          }
        },
        { retain: true }
      );

      await bot.sendMessage(
        chatId,
        `✅ *${rawType}* pada *${deviceName}* diset ke [${minV}–${maxV}], _enabled_.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await bot.sendMessage(chatId, `❌ ${err.message}`);
    }
  }
);

// 3) /enable <DeviceName> <type>
bot.onText(
  /^\/enable\s+(?:"([^"]+)"|(\S+))\s+(\w+)$/i,
  async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const rawType    = match[3].toUpperCase();
    const typeCode   = SensorTypeMap[rawType];

    if (typeCode === undefined) {
      return bot.sendMessage(chatId, `❌ Tipe sensor "${rawType}" tidak dikenal.`);
    }

    try {
      const { user, ud } = await findUserAndDevice(chatId, deviceName);

      const updated = await prisma.sensorSetting.update({
        where: {
          deviceId_userId_type: {
            deviceId: ud.deviceId,
            userId:   user.id,
            type:     rawType
          }
        },
        data: { enabled: true }
      });

      mqttPublish(
        'sensorset',
        {
          cmd:      'SET_SENSOR',
          from:     'BACKEND',
          deviceId: ud.id,
          sensor: {
            type:      typeCode,
            minValue:  updated.minValue,
            maxValue:  updated.maxValue,
            enabled:   true
          }
        },
        { retain: true }
      );

      await bot.sendMessage(
        chatId,
        `✅ *${rawType}* pada *${deviceName}* telah *enabled*.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await bot.sendMessage(chatId, `❌ ${err.message}`);
    }
  }
);

// 4) /disable <DeviceName> <type>
bot.onText(
  /^\/disable\s+(?:"([^"]+)"|(\S+))\s+(\w+)$/i,
  async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const rawType    = match[3].toUpperCase();
    const typeCode   = SensorTypeMap[rawType];

    if (typeCode === undefined) {
      return bot.sendMessage(chatId, `❌ Tipe sensor "${rawType}" tidak dikenal.`);
    }

    try {
      const { user, ud } = await findUserAndDevice(chatId, deviceName);

      const updated = await prisma.sensorSetting.update({
        where: {
          deviceId_userId_type: {
            deviceId: ud.deviceId,
            userId:   user.id,
            type:     rawType
          }
        },
        data: { enabled: false }
      });

      mqttPublish(
        'sensorset',
        {
          cmd:      'SET_SENSOR',
          from:     'BACKEND',
          deviceId: ud.id,
          sensor: {
            type:      typeCode,
            minValue:  updated.minValue,
            maxValue:  updated.maxValue,
            enabled:   false
          }
        },
        { retain: true }
      );

      await bot.sendMessage(
        chatId,
        `🚫 *${rawType}* pada *${deviceName}* telah *disabled*.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await bot.sendMessage(chatId, `❌ ${err.message}`);
    }
  }
);
