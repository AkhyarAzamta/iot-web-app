import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';

export const createAlarm = async (userId, data) => {
  const { deviceId, hour, minute, duration, enabled, lastDayTrig, lastMinTrig } = data;

  const device = await prisma.usersDevice.findFirst({
    where: { id: deviceId, userId },
  });
  if (!device) throw new HttpException(404, 'Device not found');

  return prisma.alarm.create({
    data: {
      deviceId,
      hour,
      minute,
      duration,
      enabled,
      lastDayTrig,
      lastMinTrig,
    },
  });
};

export const getAlarms = async (userId) => {
  return prisma.alarm.findMany({
    where: {
      device: {
        userId: userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
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
  const existing = await prisma.alarm.findFirst({
    where: {
      id: alarmId,
      device: { userId },
    },
  });
  if (!existing) throw new HttpException(404, 'Alarm not found');

  return prisma.alarm.update({
    where: { id: alarmId },
    data,
  });
};

export const deleteAlarm = async (userId, alarmId) => {
  const existing = await prisma.alarm.findFirst({
    where: {
      id: alarmId,
      device: { userId },
    },
  });
  if (!existing) throw new HttpException(404, 'Alarm not found');

  await prisma.alarm.delete({
    where: { id: alarmId },
  });

  return { message: 'Alarm deleted successfully' };
};
