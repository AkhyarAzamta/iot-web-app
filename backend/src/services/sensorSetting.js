import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';
import { publish as mqttPublish } from '../mqttPublisher.js';

// Map Prisma enum string → numeric code expected by ESP
const SensorTypeMap = {
  TEMPERATURE: 1,
  TURBIDITY:   2,
  TDS:         3,
  PH:          4,
};

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

export async function updateSetting(userId, type, data) {
  // 1) find existing & verify
  const existing = await getSetting(userId, type);

  // 2) verify deviceId in payload
  const dev = await prisma.usersDevice.findFirst({
    where: { id: data.deviceId, userId }
  });
  if (!dev) throw new HttpException(404, 'Device not found');

  // 3) update
  const setting = await prisma.sensorSetting.update({
    where: { id: existing.id },
    data: {
      device:   { connect: { id: dev.id } },
      minValue: data.minValue,
      maxValue: data.maxValue,
      enabled:  data.enabled
    }
  });

  // 4) publish SET_SENSOR
  mqttPublish('sensorset', {
    cmd:      'SET_SENSOR',
    from:     'BACKEND',
    deviceId: dev.id,
    sensor: {
      id:       SensorTypeMap[type],
      minValue: setting.minValue,
      maxValue: setting.maxValue,
      enabled:  setting.enabled
    }
  });
  return setting;
}
