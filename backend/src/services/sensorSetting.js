import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';

export async function getSettings(userId) {
  return prisma.sensorSetting.findMany({
    where: { device: { userId } },
    orderBy: { type: 'asc' }
  });
}

export async function getSetting(userId, type) {
  const setting = await prisma.sensorSetting.findFirst({
    where: { type, device: { userId } }
  });
  if (!setting) throw new HttpException(404, 'Sensor setting not found');
  return setting;
}

export async function createOrUpsertSetting(userId, deviceId, { type, minValue, maxValue, enabled }) {
  // cek device milik user
  const dev = await prisma.usersDevice.findFirst({
    where: { id: deviceId, userId }
  });
  if (!dev) throw new HttpException(404, 'Device not found');

  // upsert sensorSetting
  return prisma.sensorSetting.upsert({
    where: { deviceId_type: { deviceId, userId, type } },
    create: {
      device: { connect: { id: deviceId } },
      user:   { connect: { id: userId } },
      type, minValue, maxValue, enabled
    },
    update: { minValue, maxValue, enabled },
  });
}

export async function updateSetting(userId, type, data) {
  // pastikan ada
  const existing = await getSetting(userId, type);
  return prisma.sensorSetting.update({
    where: { id: existing.id },
    data
  });
}

export async function deleteSetting(userId, type) {
  const existing = await getSetting(userId, type);
  await prisma.sensorSetting.delete({
    where: { id: existing.id }
  });
}
