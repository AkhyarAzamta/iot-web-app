import { Router } from 'express';
import { authController } from '../controllers/auth.js';
import { authHander } from '../middleware/auth.js';
import { profileController } from '../controllers/profile.js';
import { deviceController } from '../controllers/device.js';

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