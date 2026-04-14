import { Router } from 'express';
import {
  getCurrentUser,
  loginAdmin,
  loginCaptain,
  registerCaptain
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/captains/register', registerCaptain);
router.post('/captains/login', loginCaptain);
router.post('/admin/login', loginAdmin);
router.get('/me', requireAuth, getCurrentUser);

export default router;

