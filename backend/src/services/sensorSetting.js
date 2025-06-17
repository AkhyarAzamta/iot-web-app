import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';
import { publish as mqttPublish } from '../mqttPublisher.js';

// Map Prisma enum string → numeric code expected by ESP
const SensorTypeMap = {
  TEMPERATURE: 0,
  TURBIDITY:   1,
  TDS:         2,
  PH:          3,
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
  const enumKey = String(type).toUpperCase();
  const numericType = SensorTypeMap[enumKey];

  if (numericType === undefined)
    throw new HttpException(400, `Invalid sensor type: ${type}`);

  // 1) find existing & verify
  const existing = await getSetting(userId, enumKey);

  // 2) verify deviceId
  const dev = await prisma.usersDevice.findFirst({
    where: { id: data.deviceId, userId }
  });
  if (!dev) throw new HttpException(404, 'Device not found');

  // 3) update DB
  const setting = await prisma.sensorSetting.update({
    where: { id: existing.id },
    data: {
      device:   { connect: { id: dev.id } },
      minValue: data.minValue,
      maxValue: data.maxValue,
      enabled:  data.enabled
    }
  });

  // 4) publish to ESP in expected format
  mqttPublish('sensorset', {
    cmd:      'SET_SENSOR',
    from:     'BACKEND',
    deviceId: dev.id,
    sensor: {
      type:      numericType,
      minValue:  setting.minValue,
      maxValue:  setting.maxValue,
      enabled:   setting.enabled
    }
  },{ retain: true });

  return setting;
}

