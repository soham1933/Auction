import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  exportAuctionsCsv,
  exportCaptainsCsv,
  exportPlayersCsv,
  exportTeamsCsv
} from '../controllers/exportController.js';

const router = Router();

router.get('/players.csv', requireAuth, requireAdmin, exportPlayersCsv);
router.get('/captains.csv', requireAuth, requireAdmin, exportCaptainsCsv);
router.get('/teams.csv', requireAuth, requireAdmin, exportTeamsCsv);
router.get('/auctions.csv', requireAuth, requireAdmin, exportAuctionsCsv);

export default router;

