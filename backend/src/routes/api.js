import { Router } from 'express';
import { authController } from '../controllers/auth.js';
import { authHander } from '../middleware/auth.js';
import { profileController } from '../controllers/profile.js';
import { deviceController } from '../controllers/device.js';
import { alarmController } from '../controllers/alarm.js';
import { sensorSettingController } from '../controllers/sensorSetting.js';

export const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.use(authHander);

router.get('/profile', profileController);
router.post('/device', deviceController.create);
router.get('/device', deviceController.get);
router.get('/device/:id', deviceController.getOne);
router.patch('/device/:id', deviceController.update);
router.delete('/device/:id', deviceController.delete);

router.post('/alarm', alarmController.create);
router.get('/alarm', alarmController.get);
router.get('/alarm/:id', alarmController.getOne);
router.patch('/alarm/:id', alarmController.update);
router.delete('/alarm/:id', alarmController.delete);

router.get('/sensor', sensorSettingController.get);
router.patch('/sensor/:type', sensorSettingController.update);
