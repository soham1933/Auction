import { getPrisma } from '../config/prisma.js';

export const getAuctionState = async (_req, res) => {
  const prisma = getPrisma();
  const latestAuction = await prisma.auction.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: {
      currentPlayer: true,
      highestBidder: true,
      soldTo: true
    }
  });

  res.json(latestAuction);
};

