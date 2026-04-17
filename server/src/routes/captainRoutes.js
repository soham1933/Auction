import { Router } from 'express';
import {
  createCaptain,
  getLeaderboard,
  getTeamsOverview,
  listCaptains
} from '../controllers/captainController.js';
import uploadCaptainAvatar from '../middleware/upload.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/teams', requireAuth, requireAdmin, getTeamsOverview);
router.get('/', requireAuth, requireAdmin, listCaptains);
router.post('/', requireAuth, requireAdmin, uploadCaptainAvatar.single('avatar'), createCaptain);

export default router;
