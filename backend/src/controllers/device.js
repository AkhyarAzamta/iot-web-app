import { createDevice, deleteDevice, getDevice, getDevices, updateDevice } from "../services/device.js";

export const deviceController = {
  create: async (req, res, next) => {
    try {
      const result = await createDevice(req.user.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  get: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1; 
      const limit = parseInt(req.query.page_size, 10) || 5; 
      const result = await getDevices(req.user.id, page, limit);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getOne: async (req, res, next) => {
    try {
      const result = await getDevice(req.user.id, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const result = await updateDevice(req.user.id, req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const result = await deleteDevice(req.user.id, req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};