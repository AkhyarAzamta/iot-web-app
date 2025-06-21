// teleBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './application/database.js';
import { publish as mqttPublish } from './mqttPublisher.js';
import { sensorBuffer } from './mqttClient.js';

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
async function getUser(chatId) { return prisma.users.findFirst({ where: { telegramChatId: String(chatId) } }); }
async function getDevices(userId) { return prisma.usersDevice.findMany({ where: { userId } }); }

// ----- /start -----
bot.onText(/^\/start$/, async msg => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return reply(chatId, 'Anda harus punya perangkat dan mendaftar di sini 👉🏻 http://localhost:3000');
  const guide = `📖 *User Guide* 📖

*Sensor Commands:*
/set - Set sensor thresholds
/sensor_status - Show sensor status

*Alarm Commands:*
/alarm_add - Add new alarm
/alarm_status - Show alarms list`;
  return reply(chatId, guide, { parse_mode: 'HTML' });
});

// ----- notifyOutOfRange -----
export async function notifyOutOfRange(deviceUuid, data) {
  const ud = await prisma.usersDevice.findUnique({ where: { id: deviceUuid }, include: { user: true } });
  const chatId = ud?.user?.telegramChatId;
  if (!chatId || silencedChats.has(chatId)) return;
  for (const { key, label, type } of SENSOR_TYPES) {
    const val = data[key];
    const setting = await prisma.sensorSetting.findFirst({ where: { deviceId: ud.deviceId, userId: ud.userId, type } });
    if (!setting || !setting.enabled) { alertState.delete(`${deviceUuid}-${type}`); continue; }
    const isOut = val < setting.minValue || val > setting.maxValue;
    const mapKey = `${deviceUuid}-${type}`;
    const prevOut = alertState.get(mapKey) || false;
    if (isOut !== prevOut) {
      const icon = isOut ? '⚠️' : '✅';
      const msg = isOut ? 'di luar batas' : 'sudah normal kembali';
      await reply(chatId,
        `Device: *${ud.deviceId}*\n${icon} *${label}* \`${val.toFixed(2)}\` ${msg} [\`${setting.minValue.toFixed(2)}\`–\`${setting.maxValue.toFixed(2)}\`]`,
        { parse_mode: 'Markdown' }
      );
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
    silencedChats.add(chatId);
    const buttons = devices.map(d => ([{ text: d.deviceId, callback_data: `D|${d.id}` }]));
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
  silencedChats.add(chatId);
  const buttons = devices.map(d => ([{ text: d.deviceId, callback_data: `STATDEV|${d.id}` }]));
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
  silencedChats.add(chatId);
  let buttons = keyboard(devices.map(d => ({ text: d.deviceId, id: d.id })), 'ALRMADD');
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
  dialogState.set(chatId, { flow: 'alarm', action: 'STATUS_STEP1', userId: user.id });
  silencedChats.add(chatId);
  let buttons = keyboard(devices.map(d => ({ text: d.deviceId, id: d.id })), 'ALRMDEV');
  buttons.push([{ text: '❌ Cancel', callback_data: 'ALRMDEV|cancel' }]);
  return reply(chatId, '*🕒 Pilih Device untuk alarm:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

// ----- Universal Callback Handler -----
bot.on('callback_query', async qry => {
  const chatId = qry.message.chat.id;
  const [prefix, param] = qry.data.split('|');
  await answer(qry.id);
  // global X|cancel
  if (prefix === 'X' && param === 'cancel') {
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(qry.message, 'Operasi dibatalkan 👌🏻');
  }
  // khusus tombol cancel di alarm_add
  if (prefix === 'ALRMADD' && param === 'cancel') {
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(qry.message, 'Operasi dibatalkan 👌🏻');
  }
  // khusus cancel di alarm_status
  if (prefix === 'ALRMDEV' && param === 'cancel') {
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(qry.message, 'Operasi dibatalkan 👌🏻');
  }
  const state = dialogState.get(chatId);
  if (!state) return;
  switch (state.flow) {
    case 'sensor': handleSensor(prefix, param, qry.message, state); break;
    case 'status': handleStatus(prefix, param, qry.message, state); break;
    case 'alarm': handleAlarm(prefix, param, qry.message, state); break;
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
  const key = `${deviceId}-${typeCode}`;
  pendingStore.set(key, { realDeviceId: ud.deviceId, userId, enumType: typeKey, minValue: minV, maxValue: maxV, enabled: true });
  pendingAck.set(key, chatId);
  mqttPublish('sensorset', {
    cmd: 'SET_SENSOR', from: 'BACKEND', deviceId, sensor: { type: typeCode, minValue: minV, maxValue: maxV, enabled: true }
  }, { retain: true });
  dialogState.delete(chatId);
  silencedChats.delete(chatId);
  return reply(chatId,
    `⌛ Mengirim *EDIT_${typeKey}* pada *${esc(ud.deviceId)}*…`,
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
    silencedChats.delete(chatId);
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
    buttons.push([{ text: '❌ Cancel', callback_data: 'X|cancel' }]);
    return edit(message, `<b>${cmd.toUpperCase()} SENSOR pada "${esc(ud.deviceId)}"</b>\nPilih Sensor:`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
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
      silencedChats.delete(chatId);
      return reply(chatId, '❌ Setting belum dibuat.');
    }
    const enabled = actionKey === 'enable';
    const typeCode = SensorTypeMap[state.typeKey];
    const key = `${state.deviceId}-${typeCode}`;
    pendingStore.set(key, { realDeviceId: ud.deviceId, userId, enumType: state.typeKey, minValue: setting.minValue, maxValue: setting.maxValue, enabled });
    pendingAck.set(key, chatId);
    mqttPublish('sensorset', { cmd: 'SET_SENSOR', from: 'BACKEND', deviceId: state.deviceId, sensor: { type: typeCode, minValue: setting.minValue, maxValue: setting.maxValue, enabled } }, { retain: true });
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(message, `⌛ Mengirim *${actionKey.toUpperCase()}_${state.typeKey}* pada *${esc(ud.deviceId)}*…`, { parse_mode: 'Markdown' });
  }
}

async function handleStatus(prefix, param, message, state) {
  if (prefix === 'STATDEV') {
    const chatId = message.chat.id;
    const deviceId = param;
    const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
    const settings = await prisma.sensorSetting.findMany({ where: { deviceId: ud.deviceId, userId: state.userId }, orderBy: { type: 'asc' } });
    const latest = sensorBuffer.find(d => d.deviceId === ud.id) || {};
    let text = `Device: <b>${ud.deviceId}</b>\n\n`;
    for (const s of settings) {
      const icon = s.enabled ? '✅' : '🚫';
      const keyName = s.type.toLowerCase();
      const raw = latest[keyName];
      const value = (raw !== undefined && raw !== null)
        ? raw.toFixed(2)
        : '-'; text += `<b>${s.type}</b>\nValue: ${value}\nmin: ${s.minValue}\nmax: ${s.maxValue}\nStatus: ${icon}\n\n`;
    }
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(message, text.trim(), { parse_mode: 'HTML' });
  }
}
async function handleAlarm(prefix, param, message, state) {
  const chatId = message.chat.id;
  if (prefix === 'ALRMADD' && state.action === 'ADD_STEP1') {
    const ud = await prisma.usersDevice.findUnique({ where: { id: param } });
    const newState = {
      ...state,
      deviceId: param,
      deviceName: ud.deviceId,
      subAction: 'add',
      action: 'AWAIT_TIME',
    };
    dialogState.set(chatId, newState);
    return edit(
      message,
      `<b>Tambah Alarm – Device ${esc(ud.deviceId)} dipilih.</b>\n` +
      `Masukkan jam (HH:MM):`,
      { parse_mode: 'HTML' }
    );
  }

  // STATUS alarm: select device
  if (prefix === 'ALRMDEV' && state.action === 'STATUS_STEP1') {
    const deviceId = param;
    const ud = await prisma.usersDevice.findUnique({ where: { id: deviceId } });
    const alarms = await prisma.alarm.findMany({ where: { deviceId }, orderBy: { id: 'asc' } });
    if (!alarms.length) {
      dialogState.delete(chatId);
      silencedChats.delete(chatId);
      return edit(message, `⚠️ Belum ada alarm pada <b>${esc(ud?.deviceId)}</b>`, { parse_mode: 'HTML' });
    }
    lastAlarmList.set(`${chatId}-${deviceId}`, alarms.map(a => a.id));
    state.action = 'AWAIT_IDX';
    state.ud = ud;
    dialogState.set(chatId, state);
    let buttons = alarms.map((a, i) => ([{ text: `${i + 1}. ${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')} ${a.enabled ? '✅' : '🚫'}`, callback_data: `ALRMIDX|${i + 1}` }]));
    buttons.push([{ text: '❌ Cancel', callback_data: 'ALRMDEV|cancel' }]);
    return edit(message, `<b>Daftar Alarm di ${esc(ud.deviceId)}</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
  }
  if (prefix === 'ALRMIDX' && state.action === 'AWAIT_IDX') {
    state.idx = Number(param);
    state.action = 'CONTROL';
    dialogState.set(chatId, state);
  const controls = [
    [{ text: '✏️ Edit',    callback_data: 'ALRMCTL|edit'    }],
    [{ text: '✅ Enable',  callback_data: 'ALRMCTL|enable'  }],
    [{ text: '🚫 Disable', callback_data: 'ALRMCTL|disable' }],
    [{ text: '🗑️ Delete',  callback_data: 'ALRMCTL|delete'  }],
    [{ text: '❌ Cancel',  callback_data: 'ALRMDEV|cancel'  }]
  ];
    return edit(message, `<b>Alarm #${state.idx} dipilih. Pilih aksi:</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: controls } });
  }
  if (prefix === 'ALRMCTL' && state.action === 'CONTROL') {
    const act = param;
    const ud = state.ud;
    const realIds = lastAlarmList.get(`${chatId}-${ud.id}`) || [];
    const alarmIdx = state.idx;
    const alarmId = realIds[alarmIdx - 1];
    const realId = realIds[state.idx - 1];
    if (act === 'edit') {
      const newState = {
        ...state,
        subAction: 'edit',
        action: 'AWAIT_TIME',
        alarmId,
        deviceId: state.ud.id,
        deviceName: state.ud.deviceId
      };
      dialogState.set(chatId, newState);
      return edit(
        message,
        `<b>Edit Alarm #${state.idx}</b>\nMasukkan jam baru (HH:MM):`,
        { parse_mode: 'HTML' }
      );
    }
    const opMap = { enable: 'ENABLE_ALARM', disable: 'DISABLE_ALARM', delete: 'DELETE_ALARM', edit: 'EDIT_ALARM' };
    const cmd = opMap[act];
    const payloadAlarm = { id: realId, enabled: act === 'enable' };
    const key = `${state.ud.id}-${cmd}-${realId}`;
    pendingAlarmAck.set(key, chatId);
    pendingAlarmStore.set(key, {});
    await mqttPublish('alarmset', { cmd, from: 'BACKEND', deviceId: state.ud.id, alarm: payloadAlarm });
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return edit(message, `⌛ Mengirim *${act.toUpperCase()}* untuk alarm #${state.idx}`, { parse_mode: 'Markdown' });
  }
}

// Tangkap input jam valid untuk ADD & EDIT
bot.onText(/^([01]\d|2[0-3]):([0-5]\d)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const st = dialogState.get(chatId);
  if (!st || st.flow !== 'alarm' || st.action !== 'AWAIT_TIME') return;

  const hour = +match[1];
  const minute = +match[2];

  dialogState.set(chatId, {
    ...st,
    action: 'AWAIT_DURATION',
    tempHour: hour,
    tempMinute: minute,
  });

  return reply(chatId,
    `<b>Jam diatur ke ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}.</b>\n` +
    `Masukkan durasi alarm (menit):`,
    { parse_mode: 'HTML' }
  );
});


// Tangkap input durasi (angka)
bot.onText(/^(\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const st = dialogState.get(chatId);
  if (!st || st.flow !== 'alarm' || st.action !== 'AWAIT_DURATION') return;

  const duration = +match[1];
  const { subAction, tempHour: hour, tempMinute: minute, deviceId, deviceName, alarmId } = st;
  if (subAction === 'add') {
    const created = await prisma.alarm.create({
      data: { deviceId, hour, minute, duration, enabled: true }
    });
    const key = `${deviceId}-ADD_ALARM-${created.id}`;
    pendingAlarmAck.set(key, chatId);
    pendingAlarmStore.set(key, {});
    await mqttPublish('alarmset', {
      cmd: 'ADD_ALARM', from: 'BACKEND', deviceId,
      alarm: { id: created.id, hour, minute, duration, enabled: true }
    });
  } else {
    const key = `${deviceId}-EDIT_ALARM-${alarmId}`;
    pendingAlarmAck.set(key, chatId);
    pendingAlarmStore.set(key, { hour, minute, duration });
    await mqttPublish('alarmset', {
      cmd: 'EDIT_ALARM', from: 'BACKEND', deviceId: deviceId,
      alarm: { id: alarmId, hour, minute, duration }
    });
  }
  dialogState.delete(chatId);
  silencedChats.delete(chatId);

  return reply(chatId,
    `⌛ Mengirim ${subAction === 'add' ? 'ADD' : 'EDIT'} ALARM pada *${esc(deviceName)}*\n`,
    { parse_mode: 'Markdown' }
  );
});

// — 3) Universal handler untuk CANCEL + validasi invalid
bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const st = dialogState.get(chatId);
  if (!st) return;

  const txt = (msg.text || '').trim();

  // 3a) Cancel / batal
  if (/^\/?(cancel|batal)$/i.test(txt)) {
    dialogState.delete(chatId);
    silencedChats.delete(chatId);
    return reply(chatId, 'Operasi dibatalkan 👌🏻');
  }

  // 3b) Invalid waktu (masih di ADD_STEP2, dan TIDAK match HH:MM)
  if (st.flow === 'alarm' && st.action === 'AWAIT_TIME') {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(txt)) {
      return reply(chatId,
        '⚠️ Format waktu tidak valid. Masukkan *HH:MM*, contoh: `07:30`',
        { parse_mode: 'Markdown' }
      );
    }
    return;
  }

  // 3c) Invalid durasi (masih di AWAIT_DURATION, dan TIDAK match angka)
  if (st.flow === 'alarm' && st.action === 'AWAIT_DURATION') {
    if (!/^\d+$/.test(txt)) {
      return reply(chatId,
        '⚠️ Format durasi tidak valid. Masukkan *angka* dalam menit, contoh: `15`',
        { parse_mode: 'Markdown' }
      );
    }
    // else: sudah match → biar onText durasi valid yang menangani
    return;
  }

  // 3d) Invalid waktu untuk EDIT_TIME
  if (st.flow === 'alarm' && st.action === 'EDIT_TIME') {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(txt)) {
      return reply(chatId,
        '⚠️ Format jam baru tidak valid. Masukkan *HH:MM*, contoh: `14:45`',
        { parse_mode: 'Markdown' }
      );
    }
  }
});

