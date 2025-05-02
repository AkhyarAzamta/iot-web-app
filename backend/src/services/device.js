import { prisma } from "../application/database.js";
import { HttpException } from "../middleware/error.js";

export const createDevice = async (userId, request) => {
  try {
    const device = await prisma.usersDevice.create({
      data: {
        deviceId: request.deviceId,
        ledState: request.ledState,
        usersId: userId,
      },
    });
    return device;
  } catch (error) {
    throw new HttpException(500, "Failed to create device");
  }
};

export const getDevices = async (userId, page = 1, limit = 5) => {
  // Pastikan page dan limit adalah angka
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 5;

  // Logging untuk debugging
  console.log(`Fetching notes for userId: ${userId}, page: ${parsedPage}, limit: ${parsedLimit}`);

  try {
    const devices = await prisma.usersDevice.findMany({
      where: {
        usersId: userId,
      },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    });

    // Logging hasil kueri
    console.log(`Found notes: ${JSON.stringify(devices)}`);

    // Jika tidak ada catatan, kembalikan data kosong
    const totalDevices = await prisma.usersDevice.count({
      where: {
        usersId: userId,
      },
    });

    const totalPages = Math.ceil(totalDevices / parsedLimit);

    return {
      message: devices.length > 0 ? "Notes retrieved successfully" : "No notes found",
      data: devices,
      paging: {
        page: parsedPage,
        page_size: parsedLimit,
        total_item: totalDevices,
        total_page: totalPages,
      },
    };
  } catch (error) {
    console.error(error);
    throw new HttpException(500, "Failed to retrieve notes");
  }
};

export const getDevice = async (userId, deviceId) => {
  try {
    const device = await prisma.usersDevice.findFirst({
      where: {
        id: deviceId,
        usersId: userId,
      },
    });

    if (!device) {
      throw new HttpException(404, "Device not found");
    }

    return device;
  } catch (error) {
    throw new HttpException(500, "Failed to retrieve device");
  }
};

export const updateDevice = async (userId, id, request) => {
  try {
    const device = await prisma.usersDevice.update({
      where: {
        id: id,
        usersId: userId,
      },
      data: {
        deviceId: request.deviceId,
        ledState: request.ledState,
      },
    });

    if (!device) {
      throw new HttpException(404, "Note not found");
    }

    return device;
  } catch (error) {
    throw new HttpException(500, "Failed to update note");
  }
};

export const deleteDevice = async (userId, id) => {
  try {
    const findDevice = await prisma.usersDevice.findFirst({
      where: {
        id,
        usersId: userId,
      },
    });

    if (!findDevice) {
      throw new HttpException(404, "Note not found");
    }

    await prisma.usersDevice.delete({
      where: {
        id,
        usersId: userId,
      },
    });

    return {
      message: "Device deleted successfully",
    };
  } catch (error) {
    throw new HttpException(500, "Failed to delete device");
  }
};