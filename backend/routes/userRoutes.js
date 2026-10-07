// User Routes
import { Router } from 'express';
import { UserController } from '../controllers/userController.js';

const router = Router();

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/preferences', UserController.updatePreferences);

export default router;
