import {
  createOrUpsertSetting,
  getSettings,
  getSetting,
  updateSetting,
  deleteSetting
} from '../services/sensorSetting.js';
import { HttpException } from '../middleware/error.js';

export const sensorSettingController = {
  // daftar semua setting user
  get: async (req, res, next) => {
    try {
      const settings = await getSettings(req.user.id);
      res.json(settings);
    } catch (e) {
      next(e);
    }
  },

  // ambil satu by type
  getOne: async (req, res, next) => {
    try {
      const type = parseInt(req.params.type, 10);
      const setting = await getSetting(req.user.id, type);
      res.json(setting);
    } catch (e) {
      next(e);
    }
  },

  // buat atau upsert (jika sudah ada)
  create: async (req, res, next) => {
    try {
      const { deviceId, type, minValue, maxValue, enabled } = req.body;
      if (!deviceId || type == null) {
        throw new HttpException(400, '`deviceId` and `type` are required');
      }
      const setting = await createOrUpsertSetting(
        req.user.id, deviceId, { type, minValue, maxValue, enabled }
      );
      res.status(201).json(setting);
    } catch (e) {
      next(e);
    }
  },

  // update existing
  update: async (req, res, next) => {
    try {
      const type = parseInt(req.params.type, 10);
      const data = req.body;  // { minValue?, maxValue?, enabled? }
      const setting = await updateSetting(req.user.id, type, data);
      res.json(setting);
    } catch (e) {
      next(e);
    }
  },

  // delete setting
  delete: async (req, res, next) => {
    try {
      const type = parseInt(req.params.type, 10);
      await deleteSetting(req.user.id, type);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
};
