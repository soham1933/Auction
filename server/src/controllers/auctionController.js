import Auction from '../models/Auction.js';

export const getAuctionState = async (_req, res) => {
  const latestAuction = await Auction.findOne()
    .sort({ updatedAt: -1 })
    .populate('currentPlayer highestBidder soldTo');

  res.json(latestAuction);
};

