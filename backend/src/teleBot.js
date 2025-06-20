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
export const pendingAlarmAck   = new Map();
export const pendingAlarmStore = new Map();
export const lastAlarmList = new Map();

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
*Sensor*
/set "<DeviceId>" <Sensor> <MinValue> <MaxValue>
/enable "<DeviceId>" <Sensor>
/disable "<DeviceId>" <Sensor>
/status_sensor "<DeviceId>"

Example:
/set "Kolam 1" TEMPERATURE 24 31
/enable "Kolam 1" TEMPERATURE
/disable "Kolam 1" TEMPERATURE
/status_sensor "Kolam 1"

*Alarm*
/alarm_add "<DeviceName>" <HH:MM> <duration>
/alarm_edit "<DeviceName>" <HH:MM> <duration>
/alarm_delete "<DeviceName>" <id>
/enable_alarm "<DeviceId>" <id>
/disable_alarm "<DeviceId>" <id>
/status_alarm "<DeviceId>"

Example:
/alarm_add "Kolam 1" 08:00 30
/alarm_edit "Kolam 1" 08:00 30
/alarm_delete "Kolam 1" 1
/enable_alarm "Kolam 1" 1
/disable_alarm "Kolam 1" 1
/status_alarm "Kolam 1"
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

// 6) /alarm_add <DeviceName> <HH:MM> <duration>
// Contoh: /alarm_add "Kolam 1" 08:30 60
// /alarm_add <DeviceName> <HH:MM> <duration>
// ── Command: add alarm ──────────────────────────────────────────────────────────

// ── STATUS ALARM ───────────────────────────────────────────────────────────────
// helper: konversi index user → realId
function getRealAlarmId(chatId, deviceUuid, idx) {
  const key = `${chatId}-${deviceUuid}`;
  const ids = lastAlarmList.get(key);
  if (!ids) throw new Error('Silakan jalankan /status_alarm dulu.');
  if (idx < 1 || idx > ids.length) throw new Error(`Index harus antara 1 dan ${ids.length}.`);
  return ids[idx-1];
}

// ── STATUS ALARM ───────────────────────────────────────────────────────────────
bot.onText(/^\/status_alarm\s+(?:"([^"]+)"|(\S+))$/i, async (msg, match) => {
  const chatId     = msg.chat.id;
  const deviceName = match[1] || match[2];
  try {
    const { ud } = await findUserAndDevice(chatId, deviceName);
    const alarms = await prisma.alarm.findMany({
      where: { deviceId: ud.id },
      orderBy: { id: 'asc' }
    });
    if (alarms.length === 0) {
      return bot.sendMessage(
        chatId,
        `⚠️ Belum ada alarm untuk <b>${deviceName}</b>.`,
        { parse_mode:'HTML' }
      );
    }

    // bangun teks dan simpan mapping
    let text = `<b>Daftar Alarm</b> untuk <b>${deviceName}</b>:\n`;
    const ids = [];
    alarms.forEach((a, idx) => {
      ids.push(a.id);
      const status = a.enabled ? '✅' : '🚫';
      text += `\n${idx+1}. ⏰ ${String(a.hour).padStart(2,'0')}:${String(a.minute).padStart(2,'0')} (${a.duration}m) ${status}`;
    });
    lastAlarmList.set(`${chatId}-${ud.id}`, ids);

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  } catch (e) {
    await bot.sendMessage(chatId, `<b>❌ ${e.message}</b>`, { parse_mode:'HTML' });
  }
});

// ── ADD ALARM ─────────────────────────────────────────────────────────────────
bot.onText(
  /^\/alarm_add\s+(?:"([^"]+)"|(\S+))\s+(\d{1,2}):(\d{2})\s+(\d+)$/i,
  async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const hour       = +match[3];
    const minute     = +match[4];
    const duration   = +match[5];

    try {
      const { ud } = await findUserAndDevice(chatId, deviceName);
      const rec = await prisma.alarm.create({
        data: { deviceId: ud.id, hour, minute, duration, enabled: true }
      });
      const id = rec.id;
      pendingAlarmAck.set(`${ud.id}-ADD-${id}`, chatId);

      mqttPublish('alarmset', {
        cmd:      'ADD_ALARM',
        from:     'BACKEND',
        deviceId: ud.id,
        alarm:    { id, hour, minute, duration, enabled:true }
      });

      await bot.sendMessage(
        chatId,
        `⌛ <b>Mengirim ADD_ALARM</b> ID ${id} ke <b>${deviceName}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await bot.sendMessage(chatId, `<b>❌ ${e.message}</b>`, { parse_mode:'HTML' });
    }
  }
);

// ── EDIT ALARM ────────────────────────────────────────────────────────────────
bot.onText(
  /^\/alarm_edit\s+(?:"([^"]+)"|(\S+))\s+(\d+)\s+(\d{1,2}):(\d{2})\s+(\d+)$/i,
  async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const idx        = +match[3];
    const hour       = +match[4];
    const minute     = +match[5];
    const duration   = +match[6];

    try {
      const { ud } = await findUserAndDevice(chatId, deviceName);
      const realId = getRealAlarmId(chatId, ud.id, idx);

      pendingAlarmStore.set(`${ud.id}-EDIT-${realId}`, { hour, minute, duration });
      pendingAlarmAck.set(`${ud.id}-EDIT-${realId}`, chatId);

      mqttPublish('alarmset', {
        cmd:      'EDIT_ALARM',
        from:     'BACKEND',
        deviceId: ud.id,
        alarm:    { id: realId, hour, minute, duration, enabled: true }
      });

      await bot.sendMessage(
        chatId,
        `⌛ <b>Mengirim EDIT_ALARM</b> #${idx} ke <b>${deviceName}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await bot.sendMessage(chatId, `<b>❌ ${e.message}</b>`, { parse_mode:'HTML' });
    }
  }
);

// ── DELETE ALARM ──────────────────────────────────────────────────────────────
bot.onText(
  /^\/alarm_delete\s+(?:"([^"]+)"|(\S+))\s+(\d+)$/i,
  async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const idx        = +match[3];

    try {
      const { ud } = await findUserAndDevice(chatId, deviceName);
      const realId = getRealAlarmId(chatId, ud.id, idx);

      pendingAlarmAck.set(`${ud.id}-DEL-${realId}`, chatId);

      mqttPublish('alarmset', {
        cmd:      'DELETE_ALARM',
        from:     'BACKEND',
        deviceId: ud.id,
        alarm:    { id: realId }
      });

      await bot.sendMessage(
        chatId,
        `⌛ <b>Mengirim DELETE_ALARM</b> #${idx} ke <b>${deviceName}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await bot.sendMessage(chatId, `<b>❌ ${e.message}</b>`, { parse_mode:'HTML' });
    }
  }
);

// ── ENABLE / DISABLE ALARM ────────────────────────────────────────────────────
;['enable_alarm','disable_alarm'].forEach(cmd => {
  const re = new RegExp(`^\\/${cmd}\\s+(?:"([^"]+)"|(\\S+))\\s+(\\d+)$`, 'i');
  bot.onText(re, async (msg, match) => {
    const chatId     = msg.chat.id;
    const deviceName = match[1] || match[2];
    const idx        = +match[3];
    const turnOn     = cmd === 'enable_alarm';

    try {
      const { ud } = await findUserAndDevice(chatId, deviceName);
      const realId = getRealAlarmId(chatId, ud.id, idx);

      pendingAlarmAck.set(`${ud.id}-${turnOn?'ENABLE':'DISABLE'}-${realId}`, chatId);

      mqttPublish('alarmset', {
        cmd:      'ENABLE_ALARM',
        from:     'BACKEND',
        deviceId: ud.id,
        alarm:    { id: realId, enabled: turnOn }
      });

      await bot.sendMessage(
        chatId,
        `⌛ <b>Mengirim ${cmd.toUpperCase()}</b> #${idx}`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await bot.sendMessage(chatId, `<b>❌ ${e.message}</b>`, { parse_mode:'HTML' });
    }
  });
});