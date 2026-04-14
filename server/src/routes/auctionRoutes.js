import { Router } from 'express';
import { getAuctionState } from '../controllers/auctionController.js';

const router = Router();

router.get('/state', getAuctionState);

export default router;
