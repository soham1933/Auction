import { Router } from 'express';
import {
  getLeaderboard,
  getTeamsOverview,
  listCaptains
} from '../controllers/captainController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/teams', requireAuth, requireAdmin, getTeamsOverview);
router.get('/', requireAuth, requireAdmin, listCaptains);

export default router;
