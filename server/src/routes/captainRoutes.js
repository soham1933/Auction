import { Router } from 'express';
import {
  getLeaderboard,
  listCaptains
} from '../controllers/captainController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/', requireAuth, requireAdmin, listCaptains);

export default router;

