import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';
import { publish } from '../mqttPublisher.js';

export const createAlarm = async (userId, data) => {
  const { deviceId, hour, minute, duration, enabled} = data;

  // 1) Validasi bahwa device milik user
  const device = await prisma.usersDevice.findFirst({
    where: { id: deviceId, userId },
  });
  if (!device) throw new HttpException(404, 'Device not found');

  // 2) Buat alarm di DB
  const created = await prisma.alarm.create({
    data: {
      device:     { connect: { id: deviceId } },
      hour,
      minute,
      duration,
      enabled
    },
  });

  // 3) Publish REQUEST_ADD ke ESP
  publish("alarmset",{
    cmd:       "ADD_ALARM",
    from:      "BACKEND",
    deviceId:  deviceId,
    alarm: {
      id: created.id,
      hour:       hour,
      minute:     minute,
      duration:   duration,
      enabled:    enabled
    },
  });

  return created;
};

export const getAlarms = async (userId) => {
  return prisma.alarm.findMany({
    where: {
      device: { userId },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getAlarm = async (userId, alarmId) => {
  const alarm = await prisma.alarm.findFirst({
    where: {
      id: alarmId,
      device: { userId },
    },
  });
  if (!alarm) throw new HttpException(404, 'Alarm not found');
  return alarm;
};

export const updateAlarm = async (userId, alarmId, data) => {
  // 1) Pastikan alarm ada dan milik user
  const existing = await prisma.alarm.findFirst({
    where: {
      id: parseInt(alarmId),
      device: { userId },
    },
  });
  if (!existing) throw new HttpException(404, 'Alarm not found');

  // 2) Update di DB
  const updated = await prisma.alarm.update({
    where: { id: parseInt(alarmId) },
    data,
  });

  // 3) Publish REQUEST_EDIT ke ESP
  publish("alarmset",{
    cmd:      "EDIT_ALARM",
    from:     "BACKEND",
    deviceId: existing.deviceId,
    alarm: {
      id:        alarmId,
      hour:      updated.hour,
      minute:    updated.minute,
      duration:  updated.duration,
      enabled:   updated.enabled
    }
  });

  return updated;
};

export const deleteAlarm = async (userId, alarmId) => {
  // 1) Pastikan alarm ada dan milik user
  const existing = await prisma.alarm.findFirst({
    where: {
      id: parseInt(alarmId),
      device: { userId },
    },
  });
  if (!existing) throw new HttpException(404, 'Alarm not found');

  // 2) Hapus dari DB
  // await prisma.alarm.delete({ where: { id: parseInt(alarmId) } });

  // 3) Publish REQUEST_DEL ke ESP
  publish("alarmset",{
    cmd:      "DELETE_ALARM",
    from:     "BACKEND",
    deviceId: existing.deviceId,
    alarm: { id: alarmId }
  });

  return { message: 'Alarm deleted successfully' };
};
