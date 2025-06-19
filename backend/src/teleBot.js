// teleBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './application/database.js';
import { publish as mqttPublish } from './mqttPublisher.js';

export const SensorTypeMap = {
  TEMPERATURE: 0,
  TURBIDITY:   1,
  TDS:         2,
  PH:          3,
};

export const SensorLabel = {
  0: 'TEMPERATURE',
  1: 'TURBIDITY',
  2: 'TDS',
  3: 'PH',
};

const SENSOR_TYPES = [
  { key: 'temperature', label: 'Temperature', type: 'TEMPERATURE' },
  { key: 'turbidity',   label: 'Turbidity',   type: 'TURBIDITY'   },
  { key: 'tds',         label: 'TDS',         type: 'TDS'         },
  { key: 'ph',          label: 'pH',          type: 'PH'          },
];

// avoid spamming the same alert repeatedly
const alertState = new Map();

// pending maps for /set, /enable, /disable
export const pendingAck   = new Map();
export const pendingStore = new Map();

export const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

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

// 1) /start
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await prisma.users.findFirst({
    where: { telegramChatId: String(chatId) }
  });
  if (!user) {
    return bot.sendMessage(
      chatId,
      'Anda harus punya perangkat dan mendaftar di sini 👉🏻 http://localhost:3000'
    );
  }
  // kalau sudah ada
  const guide = `
User Guide:
/set "<DeviceId>" <Sensor> <MinValue> <MaxValue>
/enable "<DeviceId>" <Sensor>
/disable "<DeviceId>" <Sensor>
/status_sensor "<DeviceId>"

Example:
/set "Kolam 1" TEMPERATURE 24 31
/enable "Kolam 1" TEMPERATURE
/disable "Kolam 1" TEMPERATURE
/status_sensor "Kolam 1"
`.trim();
  return bot.sendMessage(chatId, guide);
});

// Notify out-of-range / back-to-normal
export async function notifyOutOfRange(deviceUuid, data) {
  const ud = await prisma.usersDevice.findUnique({
    where:   { id: deviceUuid },
    include: { user: true }
  });
  if (!ud?.user?.telegramChatId) return;
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
      await bot.sendMessage(
        chatId,
        `Device: *${name}*\n⚠️ *${label}* \`${val.toFixed(2)}\` di luar batas [\`${s.minValue.toFixed(2)}\`–\`${s.maxValue.toFixed(2)}\`]`,
        { parse_mode: 'Markdown' }
      );
      alertState.set(mapKey, true);
    } else if (!isOut && wasOut) {
      await bot.sendMessage(
        chatId,
        `Device: *${name}*\n✅ *${label}* \`${val.toFixed(2)}\` sudah normal kembali [\`${s.minValue.toFixed(2)}\`–\`${s.maxValue.toFixed(2)}\`]`,
        { parse_mode: 'Markdown' }
      );
      alertState.set(mapKey, false);
    }
  }
}

// send SET / ENABLE / DISABLE commands and mark pending
;['set','enable','disable'].forEach(cmd => {
  const re = cmd === 'set'
    ? /^\/set\s+(?:"([^"]+)"|(\S+))\s+(\w+)\s+([\d.]+)\s+([\d.]+)/i
    : new RegExp(`^\\/${cmd}\\s+(?:"([^"]+)"|(\\S+))\\s+(\\w+)$`, 'i');

  bot.onText(re, async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const typeKey    = match[3].toUpperCase();
    const typeCode   = SensorTypeMap[typeKey];
    if (typeCode === undefined) {
      return bot.sendMessage(chatId, `❌ Tipe *${typeKey}* tidak dikenal.`, { parse_mode: 'Markdown' });
    }

    try {
      const { user, ud } = await findUserAndDevice(chatId, deviceName);

      // determine min/max/enabled for each command
      let minV, maxV, enabled;
      if (cmd === 'set') {
        minV    = parseFloat(match[4]);
        maxV    = parseFloat(match[5]);
        enabled = true;
      } else {
        const s = await prisma.sensorSetting.findFirst({
          where: { deviceId: ud.deviceId, userId: user.id, type: typeKey }
        });
        if (!s) throw new Error('Setting belum dibuat.');
        ({ minValue: minV, maxValue: maxV } = s);
        enabled = (cmd === 'enable');
      }

      // queue for reply
      const key = `${ud.id}-${typeCode}`;
      pendingStore.set(key, {
        realDeviceId: ud.deviceId,
        userId:       user.id,
        enumType:     typeKey,
        minValue:     minV,
        maxValue:     maxV,
        enabled
      });
      pendingAck.set(key, chatId);

      // publish to ESP
      mqttPublish(
        'sensorset',
        {
          cmd:      'SET_SENSOR',
          from:     'BACKEND',
          deviceId: ud.id,
          sensor: { type: typeCode, minValue: minV, maxValue: maxV, enabled }
        },
        { retain: true }
      );

      await bot.sendMessage(
        chatId,
        `⌛ Mengirim *${cmd.toUpperCase()}_${typeKey}* pada *${deviceName}*…`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await bot.sendMessage(chatId, `❌ ${err.message}`, { parse_mode: 'Markdown' });
    }
  });
});

// 5) /status_sensor <DeviceName>
bot.onText(/^\/status_sensor\s+(?:"([^"]+)"|(\S+))$/, async (msg, match) => {
  const chatId     = msg.chat.id;
  const deviceName = match[1] || match[2];
  try {
    const { user, ud } = await findUserAndDevice(chatId, deviceName);
    const settings = await prisma.sensorSetting.findMany({
      where: { deviceId: ud.deviceId, userId: user.id },
      orderBy: { type: 'asc' }
    });
    if (settings.length === 0) {
      return bot.sendMessage(
        chatId,
        `⚠️ Belum ada pengaturan sensor untuk *${deviceName}*.`,
        { parse_mode: 'Markdown' }
      );
    }
    let text = `Device: *${deviceName}*`;
    for (const s of settings) {
      text += `\n\n*${s.type}*` +
              `\nminValue: ${s.minValue}` +
              `\nmaxValue: ${s.maxValue}` +
              `\nStatus: ${s.enabled ? 'enable' : 'disable'}`;
    }
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    await bot.sendMessage(chatId, `❌ ${err.message}`, { parse_mode: 'Markdown' });
  }
});
