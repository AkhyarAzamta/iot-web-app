// teleBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './application/database.js';
import { publish as mqttPublish } from './mqttPublisher.js';

export const SensorTypeMap = {
  TEMPERATURE: 0,
  TURBIDITY: 1,
  TDS: 2,
  PH: 3,
};

export const SensorLabel = {
  0: 'TEMPERATURE',
  1: 'TURBIDITY',
  2: 'TDS',
  3: 'PH',
};

const SENSOR_TYPES = [
  { key: 'temperature', label: 'Temperature', type: 'TEMPERATURE' },
  { key: 'turbidity', label: 'Turbidity', type: 'TURBIDITY' },
  { key: 'tds', label: 'TDS', type: 'TDS' },
  { key: 'ph', label: 'pH', type: 'PH' },
];

// avoid spamming the same alert repeatedly
const alertState = new Map();
export const silencedChats = new Set();

// state per chat untuk multistep dialogs
const dialogState = new Map();

// pending maps for /set, /enable, /disable
export const pendingAck = new Map();
export const pendingStore = new Map();
export const pendingAlarmAck = new Map();
export const pendingAlarmStore = new Map();
export const lastAlarmList = new Map();

export const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// inline‐keyboard helper
function keyboardFromArray(arr, prefix, field) {
  return arr.map(item => ([{
    text: item.text,
    callback_data: `${prefix}|${field}|${item.id}`
  }]));
}

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
    where: { id: deviceUuid },
    include: { user: true }
  });
  if (!ud?.user?.telegramChatId) return;
  const chatId = ud.user.telegramChatId;
  const name = ud.deviceId;
  if (silencedChats.has(String(chatId))) return;
  for (const { key, label, type } of SENSOR_TYPES) {
    const val = data[key];
    const s = await prisma.sensorSetting.findFirst({
      where: { deviceId: ud.deviceId, userId: ud.userId, type }
    });
    if (!s || !s.enabled) {
      alertState.delete(`${deviceUuid}-${type}`);
      continue;
    }

    const isOut = val < s.minValue || val > s.maxValue;
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
;['set', 'enable', 'disable'].forEach(cmd => {
  const re = cmd === 'set'
    ? /^\/set\s+(?:"([^"]+)"|(\S+))\s+(\w+)\s+([\d.]+)\s+([\d.]+)/i
    : new RegExp(`^\\/${cmd}\\s+(?:"([^"]+)"|(\\S+))\\s+(\\w+)$`, 'i');

  bot.onText(re, async (msg, match) => {
    const chatId = msg.chat.id;
    const deviceName = match[1] || match[2];
    const typeKey = match[3].toUpperCase();
    const typeCode = SensorTypeMap[typeKey];
    if (typeCode === undefined) {
      return bot.sendMessage(chatId, `❌ Tipe *${typeKey}* tidak dikenal.`, { parse_mode: 'Markdown' });
    }

    try {
      const { user, ud } = await findUserAndDevice(chatId, deviceName);

      // determine min/max/enabled for each command
      let minV, maxV, enabled;
      if (cmd === 'set') {
        minV = parseFloat(match[4]);
        maxV = parseFloat(match[5]);
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
        userId: user.id,
        enumType: typeKey,
        minValue: minV,
        maxValue: maxV,
        enabled
      });
      pendingAck.set(key, chatId);

      // publish to ESP
      mqttPublish(
        'sensorset',
        {
          cmd: 'SET_SENSOR',
          from: 'BACKEND',
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
  const chatId = msg.chat.id;
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

// helper escape
export function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// ===== ALARM_ADD FLOW =====
// Step 1: user kirim /alarm_add
// ── ADD ALARM INLINE DIALOG ──────────────────────────────────
bot.onText(/^\/alarm_add$/, async msg => {
  const chatId = msg.chat.id;
  const user = await prisma.users.findFirst({ where: { telegramChatId: String(chatId) } });
  if (!user) return bot.sendMessage(chatId, '❌ Anda belum terdaftar.');

  const devs = await prisma.usersDevice.findMany({ where: { userId: user.id } });
  if (!devs.length) return bot.sendMessage(chatId, '⚠️ Tidak ada device.');

  dialogState.set(chatId, { action: 'ADD_STEP1', userId: user.id });
  silencedChats.add(String(chatId));

  const buttons = keyboardFromArray(
    devs.map(d => ({ text: d.deviceId, id: d.id })),
    'ALRMADD', 'device'
  );
  await bot.sendMessage(chatId, '<b>Pilih Device:</b>', {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.on('callback_query', async qry => {
  const [prefix, field, id] = qry.data.split('|');
  const chatId = qry.message.chat.id;
  const state = dialogState.get(chatId);
  if (prefix === 'ALRMADD' && state?.action === 'ADD_STEP1' && field === 'device') {
    state.deviceId = id;
    state.action = 'ADD_STEP2';
    // ambil nama device text dari button
    const deviceName = qry.message.reply_markup.inline_keyboard.flat()[0].text;
    state.deviceName = deviceName;
    await bot.editMessageText(
      `<b>Device:</b> ${esc(deviceName)}\n<b>Masukkan jam (HH:MM):</b>`,
      { chat_id: chatId, message_id: qry.message.message_id, parse_mode: 'HTML' }
    );
    return bot.answerCallbackQuery(qry.id);
  }
});

bot.onText(/^(\d{1,2}):(\d{2})$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);
  if (state?.action !== 'ADD_STEP2') return;
  const hour = +match[1], minute = +match[2];
  state.hour = hour;
  state.minute = minute;
  state.action = 'ADD_STEP3';
  return bot.sendMessage(chatId, '<b>Durasi (detik)?</b>\nContoh: 10', { parse_mode: 'HTML' });
});

bot.onText(/^(\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);
  if (state?.action !== 'ADD_STEP3') return;
  const dur = +match[1];
  const { deviceId, deviceName, hour, minute } = state;

  // simpan & publish
  const rec = await prisma.alarm.create({
    data: {
      deviceId, hour, minute, duration: dur, enabled: true
    }
  });
  const key = `${deviceId}-ADD-${rec.id}`;
  pendingAlarmAck.set(key, chatId);
  mqttPublish('alarmset', {
    cmd: 'ADD_ALARM', from: 'BACKEND',
    deviceId, alarm: { id: rec.id, hour, minute, duration: dur, enabled: true }
  });

  await bot.sendMessage(
    chatId,
    `⌛ Mengirim *ADD_ALARM* pada *${esc(deviceName)}*…`,
    { parse_mode: 'Markdown' }
  );

  dialogState.delete(chatId);
  silencedChats.delete(String(chatId));
});

// — STATUS_ALARM —
// Step 1: /status_alarm → tampilkan daftar device
bot.onText(/^\/status_alarm$/, async msg => {
  const chatId = msg.chat.id;
  const user = await prisma.users.findFirst({ where: { telegramChatId: String(chatId) } });
  if (!user) return bot.sendMessage(chatId, '❌ Anda belum terdaftar.');
  const devs = await prisma.usersDevice.findMany({ where: { userId: user.id } });
  if (!devs.length) return bot.sendMessage(chatId, '⚠️ Tidak ada device.');

  dialogState.set(chatId, { action: 'STATUS_STEP1', userId: user.id });
  silencedChats.add(String(chatId));

  const buttons = keyboardFromArray(
    devs.map(d => ({ text: d.deviceId, id: d.id })),
    'ALRMDEV', 'device'
  );
  await bot.sendMessage(chatId, '<b>Pilih Device untuk melihat alarm:</b>', {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.on('callback_query', async qry => {
  const chatId = qry.message.chat.id;
  const messageId = qry.message.message_id;
  const [prefix, field, payload] = qry.data.split('|');
  const state = dialogState.get(chatId);

  if (!state) {
    await bot.answerCallbackQuery(qry.id, { text: '⚠️ Sesi sudah berakhir atau tidak dikenali.' });
    return;
  }

  // === 1. PILIH DEVICE (untuk status_alarm) ===
  if (prefix === 'ALRMDEV' && field === 'device' && state.action === 'STATUS_STEP1') {
    const deviceId = payload;
    const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId }, include: { user: true } });
    const alarms = await prisma.alarm.findMany({ where: { deviceId }, orderBy: { id: 'asc' } });

    if (!alarms.length) {
      await bot.editMessageText(
        `⚠️ Belum ada alarm pada <b>${esc(ud.deviceId)}</b>\n Silahkan tambahkan alarm terlebih dahulu\n /alarm_add.`,
        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
      );
      dialogState.delete(chatId);
      silencedChats.delete(String(chatId));
      return bot.answerCallbackQuery(qry.id);
    }

    const buttons = alarms.map((a, i) => ({
      text: `${i + 1}. ${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')} ${a.enabled ? '✅' : '🚫'}`,
      id: i + 1
    }));
    lastAlarmList.set(`${chatId}-${deviceId}`, alarms.map(a => a.id));
    dialogState.set(chatId, { action: 'AWAIT_ALARM_IDX', ud });

    const kb = keyboardFromArray(buttons, 'ALRMIDX', 'idx');
    await bot.editMessageText(
      `<b>Daftar Alarm di ${esc(ud.deviceId)}</b>`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } }
    );
    return bot.answerCallbackQuery(qry.id);
  }

  // === 2. PILIH ALARM INDEX ===
  if (prefix === 'ALRMIDX' && field === 'idx' && state.action === 'AWAIT_ALARM_IDX') {
    state.idx = +payload;
    dialogState.set(chatId, state);

    await bot.editMessageText(
      `<b>Alarm #${state.idx} dipilih.</b>\nPilih aksi:`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Edit', callback_data: 'ALRMCTL|edit' }],
            [{ text: 'Delete', callback_data: 'ALRMCTL|delete' }],
            [{ text: 'Enable', callback_data: 'ALRMCTL|enable' }],
            [{ text: 'Disable', callback_data: 'ALRMCTL|disable' }],
            [{ text: 'Batal', callback_data: 'ALRMCTL|cancel' }]
          ]
        }
      }
    );
    return bot.answerCallbackQuery(qry.id);
  }

  // === 3. AKSI CRUD (EDIT / DELETE / ENABLE / DISABLE / CANCEL) ===
  if (prefix === 'ALRMCTL' && state.action === 'AWAIT_ALARM_IDX') {
    const act = field;
    if (!act) return bot.answerCallbackQuery(qry.id, { text: '⚠️ Perintah tidak valid.' });

    if (act === 'cancel') {
      await bot.editMessageText('❌ Operasi dibatalkan.', {
        chat_id: chatId,
        message_id: messageId
      });
      dialogState.delete(chatId);
      silencedChats.delete(String(chatId));
      return bot.answerCallbackQuery(qry.id);
    }

    state.control = act;
    dialogState.set(chatId, state);

    if (act === 'edit') {
      state.action = 'EDIT_STEP1';
      return bot.editMessageText(
        `<b>Edit Alarm #${state.idx}</b>\nMasukkan jam baru (HH:MM):`,
        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
      );
    }

    // Tangani aksi ENABLE / DISABLE / DELETE
    const realIds = lastAlarmList.get(`${chatId}-${state.ud.id}`);
    const realId = realIds[state.idx - 1];
    // Queue ACK
    const op = act === 'delete' ? 'DEL'
      : act === 'enable' ? 'ENABLE'
        : act === 'disable' ? 'DISABLE'
          : null;
    if (op) {
      const key = `${state.ud.id}-${op}-${realId}`;
      pendingAlarmAck.set(key, chatId);
      pendingAlarmStore.set(key, {});
    }

    const cmd = act === 'delete' ? 'DELETE_ALARM'
      : act === 'enable' ? 'ENABLE_ALARM'
        : act === 'disable' ? 'ENABLE_ALARM'
          : null;
    const alarmPayload = { id: realId };
    if (act === 'enable' || act === 'disable') alarmPayload.enabled = (act === 'enable');


    await bot.editMessageText(
      `⌛ Mengirim <b>${act.toUpperCase()}</b> untuk alarm #${state.idx}…`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
    );
    mqttPublish('alarmset', { cmd, from: 'BACKEND', deviceId: state.ud.id, alarm: alarmPayload });
    state.action = 'AWAIT_ACK';
    dialogState.set(chatId, state);
    silencedChats.delete(String(chatId));
    return bot.answerCallbackQuery(qry.id);

  }
});

// === 4. INPUT JAM BARU ===
bot.onText(/^(\d{1,2}):(\d{2})$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);

  if (state?.action !== 'EDIT_STEP1') return;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (isNaN(hour) || isNaN(minute) || hour > 23 || minute > 59) {
    return bot.sendMessage(chatId, '⚠️ Format jam tidak valid. Gunakan HH:MM (contoh: 08:30).');
  }

  state.hour = hour;
  state.minute = minute;
  state.action = 'EDIT_STEP2';
  dialogState.set(chatId, state);
  silencedChats.add(String(chatId));

  return bot.sendMessage(chatId, '<b>Masukkan durasi baru (dalam detik):</b>\nContoh: 60', { parse_mode: 'HTML' });
});

// === 5. INPUT DURASI BARU ===
bot.onText(/^(\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);

  if (state?.action !== 'EDIT_STEP2') return;

  const duration = parseInt(match[1], 10);
  if (isNaN(duration) || duration <= 0) {
    return bot.sendMessage(chatId, '⚠️ Durasi tidak valid. Masukkan angka lebih dari 0.');
  }

  const realIds = lastAlarmList.get(`${chatId}-${state.ud.id}`);
  const realId = realIds[state.idx - 1];
  const { hour, minute } = state;
  const key = `${state.ud.id}-EDIT-${realId}`;
  pendingAlarmStore.set(key, { hour, minute, duration });
  pendingAlarmAck.set(key, chatId);
  // Kirim perubahan ke MQTT
  mqttPublish('alarmset', {
    cmd: 'EDIT_ALARM',
    from: 'BACKEND',
    deviceId: state.ud.id,
    alarm: {
      id: realId,
      hour: state.hour,
      minute: state.minute,
      duration: duration,
      enabled: true
    }
  });

  await bot.sendMessage(
    chatId,
    `⌛ Mengirim *EDIT_ALARM* pada *${esc(state.ud.deviceId)}*…`,
    { parse_mode: 'Markdown' }
  );


  dialogState.delete(chatId);
  silencedChats.delete(String(chatId));
});
