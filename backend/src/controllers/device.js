import { 
  createDevice, getDevices, getDevice, 
  updateDevice, deleteDevice 
} from "../services/device.js";
import { HttpException } from "../middleware/error.js";

export const deviceController = {
  create: async (req, res, next) => {
    try {
      const { deviceName } = req.body;
      if (!deviceName) throw new HttpException(400, "`deviceName` is required");
      const device = await createDevice(req.user.id, deviceName);
      res.status(201).json(device);
    } catch (e) { next(e); }
  },

  get: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page)     || 1;
      const limit= parseInt(req.query.page_size)|| 5;
      const result = await getDevices(req.user.id, page, limit);
      res.json(result);
    } catch (e) { next(e); }
  },

  getOne: async (req, res, next) => {
    try {
      const device = await getDevice(req.user.id, req.params.id);
      res.json(device);
    } catch (e) { next(e); }
  },

  update: async (req, res, next) => {
    try {
      const result = await updateDevice(req.user.id, req.params.id, req.body);
      res.json(result);
    } catch (e) { next(e); }
  },

  delete: async (req, res, next) => {
    try {
      const result = await deleteDevice(req.user.id, req.params.id);
      res.json(result);
    } catch (e) { next(e); }
  }
};
