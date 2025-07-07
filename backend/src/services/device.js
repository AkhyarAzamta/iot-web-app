import { prisma } from "../application/database.js";
import { HttpException } from "../middleware/error.js";

// Perbaiki urutan parameter: (userId, deviceName)
export const createDevice = async (userId, deviceName) => {
  try {
    const device = await prisma.usersDevice.create({
      data: { userId, deviceName },
      select: { id: true, deviceName: true }
    });
    return device;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new HttpException(409, `Device "${deviceName}" is already registered to you.`);
    } 
    throw error;
  }
};

export const getDevices = async (userId, page = 1, limit = 5) => {
  const skip = (page - 1) * limit;
  const [devices, total] = await Promise.all([
    prisma.usersDevice.findMany({
      where: { userId },
      select: { id: true, deviceName: true },
      skip,
      take: limit
    }),
    prisma.usersDevice.count({ where: { userId } })
  ]);
  return {
    data: devices,
    paging: {
      page, page_size: limit,
      total_item: total,
      total_page: Math.ceil(total / limit)
    }
  };
};

export const getDevice = async (userId, id) => {
  const device = await prisma.usersDevice.findFirst({
    where: { id, userId }
  });
  if (!device) throw new HttpException(404, "Device not found");
  return device;
};

export const updateDevice = async (userId, id, { deviceName }) => {
  // hanya update deviceName string
try {
  const device = await prisma.usersDevice.update({
    where: { id },
    data: { deviceName },
    select: { id: true, deviceName: true }
  });
  return device;
} catch (error) {
  if (error.code === 'P2002') {
    throw new HttpException(409, `Device "${deviceName}" is already registered to you.`);
  } 
  throw error;
}
};

export const deleteDevice = async (userId, id) => {
  // pastikan device milik user
  const device = await prisma.usersDevice.findFirst({
    where: { id, userId }
  });
  if (!device) throw new HttpException(404, "Device not found");

  // eksekusi satu transaction: delete semua FK dulu, baru device
  await prisma.$transaction([
    // Hapus semua data sensor yang merujuk device ini
    prisma.sensorData.deleteMany({
      where: { deviceId: device.id, userId }
    }),
    // Hapus semua sensorSetting terkait
    prisma.sensorSetting.deleteMany({
      where: { deviceId: device.id, userId }
    }),
    // Hapus status LED jika ada
    // prisma.ledStatus.deleteMany({
    //   where: { deviceName: device.deviceName, userId }
    // }),
    // Akhirnya hapus device itu sendiri
    prisma.usersDevice.delete({
      where: { id }
    })
  ]);

  return { message: "Device deleted successfully" };
};
