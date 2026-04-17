import { Router } from 'express';
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  updatePlayer
} from '../controllers/playerController.js';
import { uploadPlayerAvatar } from '../middleware/upload.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', listPlayers);
router.post('/', requireAuth, requireAdmin, uploadPlayerAvatar.single('avatar'), createPlayer);
router.put('/:id', requireAuth, requireAdmin, uploadPlayerAvatar.single('avatar'), updatePlayer);
router.delete('/:id', requireAuth, requireAdmin, deletePlayer);

export default router;
