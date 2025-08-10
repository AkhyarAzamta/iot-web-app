// teleBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './application/database.js';
import { publish as mqttPublish, TOPIC_ALARMSET, TOPIC_SENSSET } from './mqttPublisher.js';
import { sensorBuffer } from './mqttClient.js';
import eventBus from './lib/eventBus.js';

// ----- Constants -----
export const SensorTypeMap = Object.freeze({ TEMPERATURE: 0, TURBIDITY: 1, TDS: 2, PH: 3 });
export const SensorLabel = Object.freeze({ 0: 'TEMPERATURE', 1: 'TURBIDITY', 2: 'TDS', 3: 'PH' });
const SENSOR_TYPES = Object.freeze([
  { key: 'temperature', label: 'Temperature', type: 'TEMPERATURE' },
  { key: 'turbidity', label: 'Turbidity', type: 'TURBIDITY' },
  { key: 'tds', label: 'TDS', type: 'TDS' },
  { key: 'ph', label: 'pH', type: 'PH' }
]);

// ----- State Stores -----
const alertState = new Map();
export const silencedChats = new Set();
const dialogState = new Map();
export const pendingAck = new Map();
export const pendingStore = new Map();
export const pendingAlarmAck = new Map();
export const pendingAlarmStore = new Map();
export const lastAlarmList = new Map();

// ----- Bot Init -----
export const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// ----- Helpers -----
export const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const reply = (chatId, text, opts = {}) => bot.sendMessage(chatId, text, opts);
const edit = (msg, text, opts = {}) => bot.editMessageText(text, { chat_id: msg.chat.id, message_id: msg.message_id, ...opts });
const answer = (id, opts = {}) => bot.answerCallbackQuery(id, opts).catch(() => { });
const keyboard = (items, prefix, field) => items.map(i => ([{ text: i.text, callback_data: `${prefix}|${i.id}` }]));
async function getUser(chatId) { return prisma.users.findFirst({ where: { telegramChatId: BigInt(chatId) } }); }
async function getDevices(userId) { return prisma.usersDevice.findMany({ where: { userId } }); }

// ----- /start & Registration Flow -----
bot.onText(/^\/start$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, 'Anda harus punya perangkat dan mendaftar di sini 👉🏻 iot-web-app.vercel.app');
  const guide = `📖 *User Guide* 📖

*Sensor Commands:*
/set - Set sensor thresholds
/sensor_status - Show sensor status

*Alarm Commands:*
/alarm_add - Add new alarm
/alarm_status - Show alarms list`;
  return reply(chatId, guide, { parse_mode: 'HTML' });
});

bot.on('callback_query', async qry => {
  const chatId = qry.message.chat.id;
  const [prefix, param] = qry.data.split('|');
  await answer(qry.id);

  if (prefix === 'REG') {
    const state = dialogState.get(chatId);
    if (!state || state.flow !== 'register') return;

    if (param === 'no') {
      dialogState.delete(chatId);
      return edit(qry.message, 'Registrasi dibatalkan.');
    }

    // param === 'yes' → minta email
    dialogState.set(chatId, { ...state, step: 2 });
    return edit(
      qry.message,
      `👍 Oke, username dicatat: <b>${esc(state.username)}</b>\n` +
      `Silakan kirim <b>email</b> kamu:`,
      { parse_mode: 'HTML' }
    );
  }

  // … handler callback lain …
});

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);
  if (!state || state.flow !== 'register') return;

  const text = (msg.text || '').trim();

  // === STEP 2: Email ===
  if (state.step === 2) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) {
      return reply(chatId, `⚠️ Format email tidak valid. Silakan kirim ulang:`, { parse_mode: 'HTML' });
    }

    try {
      const newUser = await prisma.users.create({
        data: {
          username: state.username,
          email: text,
          telegramChatId: BigInt(chatId)
        }
      });

      dialogState.set(chatId, {
        flow: 'register',
        step: 3,
        userId: newUser.id
      });

      return reply(
        chatId,
        `✅ Registrasi berhasil!\nSekarang beri nama untuk perangkatmu (contoh: <i>Kolam 1</i>):`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      if (err.code === 'P2002') {
        return reply(chatId, `⚠️ Email <b>${esc(text)}</b> sudah digunakan. Gunakan email lain.`, { parse_mode: 'HTML' });
      }
      throw err;
    }
  }

  // === STEP 3: DeviceName ===
  if (state.step === 3) {
    const deviceName = text;
    if (!deviceName || deviceName.length < 3) {
      return reply(chatId, `⚠️ Nama perangkat terlalu pendek. Coba lagi:`, { parse_mode: 'HTML' });
    }

    try {
      const device = await prisma.usersDevice.create({
        data: {
          userId: state.userId,
          deviceName
        }
      });

      dialogState.delete(chatId);

      return reply(
        chatId,
        `✅ Perangkat <b>${esc(deviceName)}</b> berhasil ditambahkan!\n` +
        `🔧 Device ID kamu: <code>${device.id}</code>\n\n` +
        `Ketik /start untuk melihat menu.`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      if (err.code === 'P2002') {
        return reply(chatId, `⚠️ Nama perangkat <b>${esc(deviceName)}</b> sudah digunakan. Gunakan nama lain.`, { parse_mode: 'HTML' });
      }
      throw err;
    }
  }
});

// … import, init bot, helpers, getUser, getDevices seperti biasa …

// ----- /device_add (Create) -----
bot.onText(/^\/device_add$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, '❌ Kamu belum terdaftar.', { parse_mode: 'HTML' });

  // Prompt user to enter new deviceName via Force Reply
  dialogState.set(chatId, { flow: 'device', action: 'ADD' });
  return reply(chatId,
    `🆕 Kirim <b>nama device</b> yang ingin kamu tambahkan:`,
    {
      parse_mode: 'HTML',
      reply_markup: { force_reply: true }
    }
  );
});

// ----- /device_list (Read + menu Update/Delete) -----
bot.onText(/^\/device_list$/, async msg => {
  const chatId = msg.chat.id;
  const user   = await getUser(chatId);
  if (!user) return reply(chatId, '❌ Kamu belum terdaftar.', { parse_mode: 'HTML' });

  const devices = await getDevices(user.id);
  if (!devices.length) return reply(chatId, '⚠️ Belum ada device.', { parse_mode: 'HTML' });

  // Inline keyboard: satu baris per device
  const buttons = devices.map(d => ([{
    text: `${esc(d.deviceName)} (…${d.id.slice(-4)})`,
    callback_data: `DEV|${d.id}` 
  }]));

  // Tambah tombol Batal di paling bawah
  buttons.push([
    { text: '↩️ Cancel', callback_data: 'DEV_CAN|-' }
  ]);

  return reply(chatId, '📋 Pilih device untuk kelola:', {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons }
  });
});

// ----- Central Callback Handler untuk Device CRUD -----
bot.on('callback_query', async qry => {
  const chatId = qry.message.chat.id;
  const [prefix, id] = qry.data.split('|');
  await answer(qry.id);

  // 1) User memilih salah satu device dari /device_list
  if (prefix === 'DEV') {
    // tampilkan opsi Rename / Delete
    return edit(qry.message,
      `Device <b>${esc(id)}</b> dipilih. Pilih aksi:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [ { text: '✏️ Rename', callback_data: `DEV_REN|${id}` } ],
            [ { text: '🗑️ Delete', callback_data: `DEV_DEL|${id}` } ],
            [ { text: '↩️ Cancel', callback_data: 'DEV_CAN|-' } ]
          ]
        }
      }
    );
  }

  // 2) Cancel
  if (prefix === 'DEV_CAN') {
    dialogState.delete(chatId);
    return edit(qry.message, 'Operasi device dibatalkan.');
  }

  // 3) Delete
  if (prefix === 'DEV_DEL') {
    await prisma.usersDevice.delete({ where: { id } });
    dialogState.delete(chatId);
    return edit(qry.message, `✅ Device <b>${esc(id)}</b> berhasil dihapus.`, { parse_mode: 'HTML' });
  }

  // 4) Rename → prompt force-reply
if (prefix === 'DEV_REN') {
  dialogState.set(chatId, { flow: 'device', action: 'RENAME', deviceId: id });
  return reply(
    chatId,
    `✏️ Kirim <b>nama baru</b> untuk device ID <code>${id}</code>:`,
    {
      parse_mode: 'HTML',
      reply_markup: { force_reply: true, selective: true }
    }
  );
}
});

// ----- Universal Message Handler for Force-Reply CRUD Steps -----
bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const state  = dialogState.get(chatId);
  if (!state || state.flow !== 'device') return;

  const text = (msg.text || '').trim();

  // === Step Add Device ===
  if (state.action === 'ADD' && msg.reply_to_message) {
    // create device
    try {
      const dev = await prisma.usersDevice.create({
        data: { userId: (await getUser(chatId)).id, deviceName: text }
      });
      dialogState.delete(chatId);
      return reply(chatId,
        `✅ Device <b>${esc(text)}</b> dibuat! ID: <code>${dev.id}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      if (e.code === 'P2002') {
        return reply(chatId, `⚠️ Nama "${esc(text)}" sudah ada. Coba nama lain.`, { parse_mode: 'HTML' });
      }
      throw e;
    }
  }

  // === Step Rename Device ===
  if (state.action === 'RENAME' && msg.reply_to_message) {
    try {
      const updated = await prisma.usersDevice.update({
        where: { id: state.deviceId },
        data: { deviceName: text }
      });
      dialogState.delete(chatId);
      return reply(chatId,
        `✅ Device ID <code>${updated.id}</code> diganti jadi <b>${esc(text)}</b>.`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      if (e.code === 'P2002') {
        return reply(chatId, `⚠️ Nama "${esc(text)}" sudah ada. Coba nama lain.`, { parse_mode: 'HTML' });
      }
      throw e;
    }
  }
});


// ----- notifyOutOfRange -----
export async function notifyOutOfRange(deviceId, data) {
  const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId }, include: { user: true } });
  const chatId = ud?.user?.telegramChatId;
  if (!chatId || silencedChats.has(String(chatId))) return;
  for (const { key, label, type } of SENSOR_TYPES) {
    const val = data[key];
    const setting = await prisma.sensorSetting.findFirst({ where: { deviceId: ud.id, userId: ud.userId, type } });
    if (!setting || !setting.enabled) { alertState.delete(`${deviceId}-${type}`); continue; }
    const isOut = val < setting.minValue || val > setting.maxValue;
    const mapKey = `${deviceId}-${type}`;
    const prevOut = alertState.get(mapKey) || false;
    if (isOut !== prevOut) {
      const status = isOut ? 'warning' : 'info';
      const icon = isOut ? '⚠️' : '✅';
      const msg = isOut ? 'di luar batas' : 'sudah normal kembali';
      await reply(chatId,
        `Device: *${ud.deviceName}*\n${icon} *${label}* \`${val.toFixed(1)}\` ${msg} [\`${setting.minValue.toFixed(1)}\`–\`${setting.maxValue.toFixed(1)}\`]`,
        { parse_mode: 'Markdown' }
      );
        eventBus.emit(ud.user.id, {
        deviceName: ud.deviceName,
        message: `${label} \`${val.toFixed(1)}\` ${msg} [\`${setting.minValue.toFixed(1)}\`–\`${setting.maxValue.toFixed(1)}\`]`,
        status
      });
      alertState.set(mapKey, isOut);
    }
  }
}

// ----- Flows -----
const commands = ['set', 'enable', 'disable'];
for (const cmd of commands) {
  bot.onText(new RegExp(`^\\/${cmd}$`, 'i'), async msg => {
    const chatId = msg.chat.id;
    const user = await getUser(chatId);
    if (!user) return reply(chatId, '❌ Anda belum terdaftar.');
    const devices = await getDevices(user.id);
    if (!devices.length) return reply(chatId, '⚠️ Tidak ada device.');
    dialogState.set(chatId, { flow: 'sensor', step: 1, cmd, userId: user.id });
    silencedChats.add(String(chatId));
    const buttons = devices.map(d => ([{ text: d.deviceName, callback_data: `D|${d.id}` }]));
    buttons.push([{ text: '❌ Cancel', callback_data: 'X|cancel' }]);
    return reply(chatId, `*${cmd.toUpperCase()} SENSOR* – Pilih device:`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });
}

// ----- Sensor Status -----
bot.onText(/^\/sensor_status$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, '❌ Anda belum terdaftar.');
  const devices = await getDevices(user.id);
  if (!devices.length) return reply(chatId, '⚠️ Tidak ada device.');
  dialogState.set(chatId, { flow: 'status', action: 'STATDEV', userId: user.id });
  silencedChats.add(String(chatId));
  const buttons = devices.map(d => ([{ text: d.deviceName, callback_data: `STATDEV|${d.id}` }]));
  buttons.push([{ text: '❌ Cancel', callback_data: 'X|cancel' }]);
  return reply(chatId, '*📊 Pilih Device:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

// ----- Alarm Add -----
bot.onText(/^\/alarm_add$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, '❌ Anda belum terdaftar.');
  const devices = await getDevices(user.id);
  if (!devices.length) return reply(chatId, '⚠️ Tidak ada device.');
  dialogState.set(chatId, { flow: 'alarm', action: 'ADD_STEP1', userId: user.id });
  silencedChats.add(String(chatId));
  let buttons = keyboard(devices.map(d => ({ text: d.deviceName, id: d.id })), 'ALRMADD');
  buttons.push([{ text: '❌ Cancel', callback_data: 'ALRMADD|cancel' }]);
  return reply(chatId, '*⏰ Pilih Device:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

// ----- Alarm Status -----
bot.onText(/^\/alarm_status$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, '❌ Anda belum terdaftar.');
  const devices = await getDevices(user.id);
  if (!devices.length) return reply(chatId, '⚠️ Tidak ada device.');
  dialogState.set(chatId, { flow: 'alarm', action: 'STATUS_STEP1', userId: user.id, deviceId: devices[0].id });
  silencedChats.add(String(chatId));
  let buttons = keyboard(devices.map(d => ({ text: d.deviceName, id: d.id })), 'ALRMDEV');
  buttons.push([{ text: '❌ Cancel', callback_data: 'ALRMDEV|cancel' }]);
  return reply(chatId, '*🕒 Pilih Device untuk alarm:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

// ----- Universal Callback Handler -----
bot.on('callback_query', async qry => {
  const chatId = qry.message.chat.id;
  const [prefix, param] = qry.data.split('|');
  await answer(qry.id);
  const state = dialogState.get(chatId);

  // global X|cancel
  if (prefix === 'X' && param === 'cancel') {
    dialogState.delete(chatId);
    silencedChats.delete(String(chatId));
    return edit(qry.message, 'Operasi dibatalkan 👌🏻');
  }

  if (prefix === 'SSYNC' && param === 'Ssync') {
    const sensors = await prisma.sensorSetting.findMany({
      where: { deviceId: state.deviceId },
      select: { type: true, minValue: true, maxValue: true, enabled: true },
      orderBy: { type: 'asc' }
    });
    await mqttPublish('sensorset', {
      cmd: 'SYNC_SENSOR', from: 'BACKEND',
      deviceId: state.deviceId, sensors
    });
    dialogState.delete(chatId);
    silencedChats.delete(String(chatId));
    return bot.editMessageText('⌛ Mengirim Request Sync Sensor…', {
      chat_id: chatId, message_id: qry.message.message_id
    });
  }

  if (!state) return;
  switch (state.flow) {
    case 'sensor': handleSensor(prefix, param, qry.message, state); break;
    case 'status': handleStatus(prefix, param, qry.message, state); break;
  }
});

// ----- Sensor Edit Validation Handler -----
bot.onText(/^([\d.]+)\s+([\d.]+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);
  if (!state || state.flow !== 'sensor' || state.step !== 4) return;
  const minV = parseFloat(match[1]);
  const maxV = parseFloat(match[2]);
  if (isNaN(minV) || isNaN(maxV)) {
    return reply(chatId,
      '⚠️ Format tidak valid. Masukkan dua angka (min max), contoh: `10 30`',
      { parse_mode: 'Markdown' }
    );
  }
  const { deviceId, typeKey, userId } = state;
  const typeCode = SensorTypeMap[typeKey];
  const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
  const key = `${ud.id}-${typeCode}`;
  pendingStore.set(key, { deviceId: ud.id, deviceName: ud.deviceName, userId, enumType: typeKey, minValue: minV, maxValue: maxV, enabled: true });
  pendingAck.set(key, chatId);
  mqttPublish('sensorset', {
    cmd: 'SET_SENSOR', from: 'BACKEND', deviceId, sensor: { type: typeCode, minValue: minV, maxValue: maxV, enabled: true }
  }, { retain: true });
  dialogState.delete(chatId);
  silencedChats.delete(String(chatId));
  return reply(chatId,
    `⌛ Mengirim *EDIT ${typeKey}* pada *${esc(ud.deviceName)}*`,
    { parse_mode: 'Markdown' }
  );
});

// ----- Universal Message Handler -----
bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const state = dialogState.get(chatId);
  if (!state) return;
  const text = (msg.text || '').trim();
  if (/^\/?(cancel|batal)$/i.test(text)) {
    dialogState.delete(chatId);
    silencedChats.delete(String(chatId));
    return reply(chatId, 'Operasi dibatalkan 👌🏻');
  }
});

// ----- Universal Help -----
bot.onText(/^(\/help|\/bantuan)$/i, msg => {
  return reply(msg.chat.id, 'Hubungi developer untuk bantuan 📨 akhyar.azamta@gmail.com', { parse_mode: 'Markdown' });
});

// ----- Handler Implementations -----
async function handleSensor(prefix, param, message, state) {
  const chatId = message.chat.id;
  const { step, cmd, userId } = state;
  if (step === 1 && prefix === 'D') {
    const deviceId = param;
    dialogState.set(chatId, { ...state, step: 2, deviceId });
    const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
    const buttons = SENSOR_TYPES.map(s => ([{ text: s.label, callback_data: `S|${s.type}` }]));
    buttons.push([{ text: '📡 Sync Sensor', callback_data: `SSYNC|Ssync` }, { text: '❌ Cancel', callback_data: 'X|cancel' }]);
    return edit(message, `<b>${cmd.toUpperCase()} SENSOR pada "${esc(ud.deviceName)}"</b>\nPilih Sensor:`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
  }
  if (step === 2 && prefix === 'S') {
    const typeKey = param;
    dialogState.set(chatId, { ...state, step: 3, typeKey });
    const buttons = [
      [{ text: '✏️ Edit', callback_data: 'A|edit' }],
      [{ text: '✅ Enable', callback_data: 'A|enable' }],
      [{ text: '🚫 Disable', callback_data: 'A|disable' }],
      [{ text: '❌ Cancel', callback_data: 'X|cancel' }]
    ];
    return edit(message, `<b>${cmd.toUpperCase()} SENSOR – ${typeKey}</b>\nPilih Aksi:`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
  }
  if (step === 3 && prefix === 'A') {
    const actionKey = param;
    const ud = await prisma.usersDevice.findUnique({ where: { id: state.deviceId } });
    const setting = await prisma.sensorSetting.findFirst({ where: { deviceId: ud.deviceId, userId, type: state.typeKey } });
    if (actionKey === 'edit') {
      dialogState.set(chatId, { ...state, step: 4, actionKey });
      return edit(message, `<b>EDIT SENSOR – ${state.typeKey}</b>\nKirim nilai min dan max (contoh: <code>10 30</code>):`, { parse_mode: 'HTML' });
    }
    if (!setting) {
      dialogState.delete(chatId);
      silencedChats.delete(String(chatId));
      return reply(chatId, '❌ Setting belum dibuat.');
    }
    const enabled = actionKey === 'enable';
    const typeCode = SensorTypeMap[state.typeKey];
    pendingStore.set(ud.userId, { deviceId: ud.id, deviceName: ud.deviceName, userId, enumType: state.typeKey, minValue: setting.minValue, maxValue: setting.maxValue, enabled });
    pendingAck.set(ud.userId, chatId);
    mqttPublish('sensorset', { cmd: 'SET_SENSOR', from: 'BACKEND', deviceId: state.deviceId, sensor: { type: typeCode, minValue: setting.minValue, maxValue: setting.maxValue, enabled } }, { retain: true });
    dialogState.delete(chatId);
    silencedChats.delete(String(chatId));
    return edit(message, `⌛ Mengirim *${actionKey.toUpperCase()}_${state.typeKey}* pada *${esc(ud.deviceName)}*`, { parse_mode: 'Markdown' });
  }
}

async function handleStatus(prefix, param, message, state) {
  if (prefix !== 'STATDEV') return;

  const chatId = message.chat.id;
  const deviceId = param;
  const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
  const settings = await prisma.sensorSetting.findMany({
    where: { deviceId: ud.id, userId: state.userId },
    orderBy: { type: 'asc' }
  });
  const latest = sensorBuffer.find(d => d.deviceId === ud.id) || {};

  // Column widths
  const COL_SENSOR = 12;   // width for the sensor name
  const COL_VALUE = 6;    // width for the current value
  const COL_MIN = 6;    // width for the min value
  const COL_MAX = 6;    // width for the max value

  // Build header
  let table = '';
  table +=
    'Sensor'.padEnd(COL_SENSOR) + ' ' +
    'Value'.padStart(COL_VALUE) + ' ' +
    'Min'.padStart(COL_MIN) + ' ' +
    'Max'.padStart(COL_MAX) + ' ' +
    'Status' + '\n';

  // Separator
  table +=
    '-'.repeat(COL_SENSOR) + ' ' +
    '-'.repeat(COL_VALUE) + ' ' +
    '-'.repeat(COL_MIN) + ' ' +
    '-'.repeat(COL_MAX) + ' ' +
    '------' + '\n';

  // Rows
  for (const s of settings) {
    const icon = s.enabled ? '✅' : '🚫';
    const raw = latest[s.type.toLowerCase()];
    const value = raw != null
      ? raw.toFixed(1).padStart(COL_VALUE)
      : '-'.padStart(COL_VALUE);
    const minStr = s.minValue.toFixed(1).padStart(COL_MIN);
    const maxStr = s.maxValue.toFixed(1).padStart(COL_MAX);
    const label = s.type.padEnd(COL_SENSOR);

    table +=
      label + ' ' +
      value + ' ' +
      minStr + ' ' +
      maxStr + ' ' +
      icon + '\n';
  }

  const text =
    `Device: <b>${ud.deviceName}</b>\n\n` +
    `<pre>${table}</pre>`;

  dialogState.delete(chatId);
  silencedChats.delete(String(chatId));
  return edit(message, text, { parse_mode: 'HTML' });
}

// — 3) Universal handler untuk CANCEL + validasi invalid
bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const st = dialogState.get(chatId);
  if (!st) return;

  const txt = (msg.text || '').trim();

  // 3a) Cancel / batal
  if (/^\/?(cancel|batal)$/i.test(txt)) {
    dialogState.delete(chatId);
    silencedChats.delete(String(chatId));
    return reply(chatId, 'Operasi dibatalkan 👌🏻');
  }
});

