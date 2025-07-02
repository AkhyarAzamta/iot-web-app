// ===== CONTROLLER (sensorDataController.js) =====
import { 
  deleteSensorData,
  getAllSensorData
} from "../services/sensorData.js";
import { HttpException } from "../middleware/error.js";

export const sensorDataController = {
  get: async (req, res, next) => {
    try {
      // Validasi device_id adalah wajib
      const deviceId = req.query.device_id;
      if (!deviceId) {
        throw new HttpException(400, 'device_id is required');
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.page_size) || 10;
      
      const timeFilter = req.query.time_filter;
      const dateFrom = req.query.date_from;
      const dateTo = req.query.date_to;
      
      const result = await getAllSensorData(req.user.id, {
        page,
        limit,
        deviceId, // Required parameter
        timeFilter,
        dateFrom,
        dateTo
      });
      
      res.json(result);
    } catch (e) { 
      next(e); 
    }
  },

  delete: async (req, res, next) => {
    try {
      const result = await deleteSensorData(req.user.id, req.params.id);
      res.json(result);
    } catch (e) { 
      next(e); 
    }
  }
};