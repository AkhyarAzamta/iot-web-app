// services/sensorSetting.js
import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';
import { publish as mqttPublish } from '../mqttPublisher.js';
import { pendingAck, pendingStore, SensorTypeMap } from '../teleBot.js';

/**
 * Fetch all sensor settings for a user
 */
export async function getSettings(userId, deviceId) {
  return prisma.sensorSetting.findMany({
    where: {
      device: {
        userId,
        id: deviceId    // pastikan ini, agar filter per device
      }
    },
    orderBy: { type: "asc" }
  });
}

/**
 * Fetch one setting by type
 */
export async function getSetting(userId, type) {
  const setting = await prisma.sensorSetting.findFirst({
    where: { type, device: { userId } }
  });
  if (!setting) throw new HttpException(404, 'Sensor setting not found');
  return setting;
}

/**
 * Update a sensor setting immediately, then publish to ESP.
 * The DB is updated straight away so your API clients see the change.
 */
export async function updateSetting(userId, type, data) {
  const { deviceId, minValue, maxValue, enabled } = data;
  const enumKey     = String(type).toUpperCase();
  const numericType = SensorTypeMap[enumKey];
  if (numericType === undefined) {
    throw new HttpException(400, `Invalid sensor type: ${type}`);
  }
  // 1) ensure this setting exists
  const existing = await getSetting(userId, enumKey);

  // 2) verify device belongs to this user
  const dev = await prisma.usersDevice.findFirst({
    where: { id: deviceId, userId },
    include: { user: true }
  });

  if (!dev) throw new HttpException(404, 'Device not found or not owned by you');
  // 3) immediately update the DB
  const updated = await prisma.sensorSetting.update({
    where: {
      deviceId_userId_type: {
        deviceId: dev.id,
        userId,
        type: enumKey
      }
    },
    data: {
      minValue,
      maxValue,
      enabled
    }
  });

  // 4) publish to the ESP (retain so offline devices pick it up)
  mqttPublish(
    'sensorset',
    {
      cmd:      'SET_SENSOR',
      from:     'BACKEND',
      deviceId: dev.id,
      sensor: {
        type:     numericType,
        minValue: updated.minValue,
        maxValue: updated.maxValue,
        enabled:  updated.enabled
      }
    },
    { retain: true }
  );
      pendingStore.set(dev.id, { deviceId: dev.id, deviceName: dev.deviceName, userId: dev.userId, enumType: enumKey, minValue: updated.minValue, maxValue: updated.maxValue, enabled: updated.enabled });
      pendingAck.set(dev.id, dev.user.telegramChatId);
  // 5) return the freshly updated setting
  return updated;
}
