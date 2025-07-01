import {
  getSettings,
  getSetting,
  updateSetting,
} from '../services/sensorSetting.js';

export const sensorSettingController = {
  // GET /sensor
  get: async (req, res, next) => {
    try {
      const deviceId = req.params.deviceId;
      const settings = await getSettings(req.user.id, deviceId);
      return res.json({
        deviceId,
        sensor: settings
      });
        } catch (e) {
      next(e);
    }
  },

  // GET /sensor/:type
  getOne: async (req, res, next) => {
    try {
      const type = req.params.type;
      const setting = await getSetting(req.user.id, type);
      res.json(setting);
    } catch (e) {
      next(e);
    }
  },

  // PUT /sensor
  update: async (req, res, next) => {
    try {
      const type = req.params.type;
      const payload = {
        ...req.body,
        type,
      };
      const setting = await updateSetting(req.user.id, type, payload);
      res.json(setting);
    } catch (e) {
      next(e);
    }
  }
};
