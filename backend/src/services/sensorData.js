// ===== SERVICE (sensorData.js) =====
import { prisma } from '../application/database.js';
import { HttpException } from '../middleware/error.js';

export const getAllSensorData = async (userId, options = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    deviceId, // Required parameter
    timeFilter, 
    dateFrom, 
    dateTo 
  } = options;
  
  // Validasi deviceId wajib ada
  if (!deviceId) {
    throw new HttpException(400, 'device_id is required');
  }
  
  const skip = (page - 1) * limit;
   
  // Pastikan device milik user dan ada
  const device = await prisma.usersDevice.findFirst({
    where: {
      id: deviceId,
      userId: userId
    }
  });
  
  if (!device) {
    throw new HttpException(404, 'Device not found or not accessible');
  }
  
  // Build where condition - deviceId sudah pasti ada
  let whereCondition = { 
    deviceId: deviceId // Filter berdasarkan deviceId yang spesifik
  };

  // Filter berdasarkan waktu
  if (timeFilter || dateFrom || dateTo) {
    whereCondition.createdAt = {};
    
    if (timeFilter) {
      const now = new Date();
      let startDate;
      
      switch (timeFilter) {
        case 'day':
          // Data hari ini
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          whereCondition.createdAt.gte = startDate;
          break;
          
        case 'week':
          // Data 7 hari terakhir
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          whereCondition.createdAt.gte = startDate;
          break;
          
        case 'month':
          // Data 30 hari terakhir
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          whereCondition.createdAt.gte = startDate;
          break;
          
        default:
          throw new HttpException(400, 'Invalid time_filter. Use: day, week, or month');
      }
    }
    
    // Custom date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (isNaN(fromDate.getTime())) {
        throw new HttpException(400, 'Invalid date_from format. Use YYYY-MM-DD');
      }
      whereCondition.createdAt.gte = fromDate;
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (isNaN(toDate.getTime())) {
        throw new HttpException(400, 'Invalid date_to format. Use YYYY-MM-DD');
      }
      // Tambah 1 hari untuk include sampai akhir hari
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      whereCondition.createdAt.lt = endDate;
    }
  }   
  
  const [sensordata, total] = await Promise.all([
    prisma.sensorData.findMany({
      where: whereCondition,
      select: { 
        id: true, 
        deviceId: true, 
        temperature: true, 
        turbidity: true, 
        tds: true, 
        ph: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.sensorData.count({ where: whereCondition })
  ]);
  
  return {
    data: sensordata,
    paging: {
      page, 
      page_size: limit,
      total_item: total,
      total_page: Math.ceil(total / limit)
    },
    filters: {
      device_id: deviceId, // Always present now
      time_filter: timeFilter,
      date_from: dateFrom,
      date_to: dateTo
    }
  };
};

export const deleteSensorData = async (userId, sensorDataId) => {
  // 1) Pastikan sensor data ada dan milik user
  const existing = await prisma.sensorData.findFirst({
    where: {
      id: parseInt(sensorDataId),
      device: { userId },
    },
  });
  
  if (!existing) {
    throw new HttpException(404, 'Sensor Data not found or not accessible');
  }

  // 2) Hapus dari DB
  await prisma.sensorData.delete({ 
    where: { id: parseInt(sensorDataId) } 
  });
  
  return { message: 'Sensor Data deleted successfully' };
};
