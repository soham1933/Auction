import { Router } from 'express';
import {
  createPlayer,
  listPlayers,
  updatePlayer
} from '../controllers/playerController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', listPlayers);
router.post('/', requireAuth, requireAdmin, createPlayer);
router.put('/:id', requireAuth, requireAdmin, updatePlayer);

export default router;

