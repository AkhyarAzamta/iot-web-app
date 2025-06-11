import {
  createAlarm,
  getAlarms,
  getAlarm,
  updateAlarm,
  deleteAlarm,
} from '../services/alarm.js';

export const alarmController = {
  create: async (req, res, next) => {
    try {
      const result = await createAlarm(req.user.id, req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
  get: async (req, res, next) => {
    try {
      const result = await getAlarms(req.user.id);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  },
  getOne: async (req, res, next) => {
    try {
      const result = await getAlarm(req.user.id, req.params.id);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  },
  update: async (req, res, next) => {
    try {
      const result = await updateAlarm(req.user.id, req.params.id, req.body);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  },
  delete: async (req, res, next) => {
    try {
      const result = await deleteAlarm(req.user.id, req.params.id);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  },
};
