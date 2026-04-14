import Auction from '../models/Auction.js';
import Captain from '../models/Captain.js';
import Player from '../models/Player.js';
import { getSocketUser } from '../middleware/auth.js';

const AUCTION_ROOM = process.env.AUCTION_ROOM || 'global-auction-room';
const MIN_BID_INCREMENT = Number(process.env.MIN_BID_INCREMENT || 100);
const DEFAULT_AUCTION_DURATION = Number(process.env.DEFAULT_AUCTION_DURATION || 300);

let liveAuction = {
  id: null,
  currentPlayer: null,
  currentBid: 0,
  highestBidder: null,
  status: 'idle',
  bidHistory: [],
  soldFor: 0,
  soldTo: null,
  startedAt: null,
  endsAt: null
};

let countdownInterval = null;

const serializeAuction = () => ({
  ...liveAuction,
  timeLeft: liveAuction.endsAt
    ? Math.max(0, Math.ceil((new Date(liveAuction.endsAt).getTime() - Date.now()) / 1000))
    : 0
});

const getLeaderboardPayload = async () => {
  const captains = await Captain.find().populate('players');

  return captains
    .map((captain) => ({
      id: captain._id.toString(),
      name: captain.name,
      budget: captain.budget,
      totalSpent: captain.totalSpent,
      playersBought: captain.players.length,
      players: captain.players
    }))
    .sort((a, b) => {
      if (b.playersBought !== a.playersBought) {
        return b.playersBought - a.playersBought;
      }

      if (b.budget !== a.budget) {
        return b.budget - a.budget;
      }

      return b.totalSpent - a.totalSpent;
    });
};

const emitLeaderboard = async (io) => {
  const leaderboard = await getLeaderboardPayload();
  io.to(AUCTION_ROOM).emit('leaderboardUpdate', leaderboard);
};

const clearAuctionTimer = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
};

const resetAuction = () => {
  liveAuction = {
    id: null,
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    status: 'idle',
    bidHistory: [],
    soldFor: 0,
    soldTo: null,
    startedAt: null,
    endsAt: null
  };
};

const emitSnapshot = async (io, socket = null) => {
  const payload = {
    auction: serializeAuction(),
    leaderboard: await getLeaderboardPayload()
  };

  if (socket) {
    socket.emit('snapshot', payload);
    return;
  }

  io.to(AUCTION_ROOM).emit('snapshot', payload);
};

const closeAuctionInternally = async (io, reason = 'closed') => {
  clearAuctionTimer();

  if (liveAuction.id) {
    await Auction.findByIdAndUpdate(liveAuction.id, {
      status: 'closed',
      endsAt: new Date()
    });
  }

  io.to(AUCTION_ROOM).emit('auctionClosed', {
    reason,
    auction: {
      ...serializeAuction(),
      status: 'closed'
    }
  });

  liveAuction.status = 'closed';
  liveAuction.endsAt = new Date();
};

const moveAuctionToAwaitingClose = async (io) => {
  clearAuctionTimer();

  if (liveAuction.id) {
    await Auction.findByIdAndUpdate(liveAuction.id, {
      status: 'awaiting-close',
      endsAt: new Date()
    });
  }

  liveAuction.status = 'awaiting-close';
  liveAuction.endsAt = new Date();

  io.to(AUCTION_ROOM).emit('timerUpdate', {
    timeLeft: 0,
    status: liveAuction.status
  });
  io.to(AUCTION_ROOM).emit('auctionAwaitingClose', serializeAuction());
};

const startTimer = (io) => {
  clearAuctionTimer();

  countdownInterval = setInterval(async () => {
    const timeLeft = serializeAuction().timeLeft;

    io.to(AUCTION_ROOM).emit('timerUpdate', {
      timeLeft,
      status: liveAuction.status
    });

    if (timeLeft <= 0 && liveAuction.status === 'live') {
      await moveAuctionToAwaitingClose(io);
    }
  }, 1000);
};

export const registerAuctionHandlers = (io) => {
  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    socket.data.user = await getSocketUser(token);
    socket.join(AUCTION_ROOM);

    await emitSnapshot(io, socket);

    socket.on('startAuction', async ({ playerId, duration = DEFAULT_AUCTION_DURATION }) => {
      try {
        if (socket.data.user?.role !== 'admin') {
          socket.emit('auctionError', 'Only admins can start auctions');
          return;
        }

        if (liveAuction.status === 'live') {
          socket.emit('auctionError', 'Close the current auction before starting another');
          return;
        }

        const player = await Player.findById(playerId);

        if (!player) {
          socket.emit('auctionError', 'Player not found');
          return;
        }

        clearAuctionTimer();

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + Number(duration) * 1000);

        const auctionDoc = await Auction.create({
          currentPlayer: player._id,
          currentBid: player.basePrice,
          highestBidder: null,
          status: 'live',
          startedAt: startTime,
          endsAt: endTime
        });

        liveAuction = {
          id: auctionDoc._id.toString(),
          currentPlayer: player.toObject(),
          currentBid: player.basePrice,
          highestBidder: null,
          status: 'live',
          bidHistory: [
            {
              amount: player.basePrice,
              bidderName: 'Opening Price',
              createdAt: startTime.toISOString()
            }
          ],
          soldFor: 0,
          soldTo: null,
          startedAt: startTime,
          endsAt: endTime
        };

        io.to(AUCTION_ROOM).emit('startAuction', serializeAuction());
        await emitLeaderboard(io);
        startTimer(io);
      } catch (error) {
        socket.emit('auctionError', error.message);
      }
    });

    socket.on('newBid', async ({ amount }) => {
      try {
        if (socket.data.user?.role !== 'captain') {
          socket.emit('auctionError', 'Only captains can bid');
          return;
        }

        if (liveAuction.status !== 'live' || !liveAuction.currentPlayer) {
          socket.emit('auctionError', 'There is no active auction');
          return;
        }

        const bidAmount = Number(amount);
        const minimumAllowed = liveAuction.currentBid + MIN_BID_INCREMENT;

        if (Number.isNaN(bidAmount) || bidAmount < minimumAllowed) {
          socket.emit(
            'auctionError',
            `Bid must be at least ${minimumAllowed}`
          );
          return;
        }

        const captain = await Captain.findById(socket.data.user.id);

        if (!captain) {
          socket.emit('auctionError', 'Captain account not found');
          return;
        }

        if (captain.budget < bidAmount) {
          socket.emit('auctionError', 'Insufficient budget for this bid');
          return;
        }

        liveAuction.currentBid = bidAmount;
        liveAuction.highestBidder = {
          id: captain._id.toString(),
          name: captain.name
        };
        liveAuction.bidHistory = [
          {
            amount: bidAmount,
            bidderName: captain.name,
            createdAt: new Date().toISOString()
          },
          ...liveAuction.bidHistory
        ].slice(0, 12);

        await Auction.findByIdAndUpdate(liveAuction.id, {
          currentBid: bidAmount,
          highestBidder: captain._id
        });

        io.to(AUCTION_ROOM).emit('updateBid', serializeAuction());
      } catch (error) {
        socket.emit('auctionError', error.message);
      }
    });

    socket.on('playerSold', async () => {
      try {
        if (socket.data.user?.role !== 'admin') {
          socket.emit('auctionError', 'Only admins can sell players');
          return;
        }

        if (!liveAuction.currentPlayer || !liveAuction.highestBidder) {
          socket.emit('auctionError', 'A highest bidder is required to sell');
          return;
        }

        clearAuctionTimer();

        const captain = await Captain.findById(liveAuction.highestBidder.id);
        const player = await Player.findById(liveAuction.currentPlayer._id);

        if (!captain || !player) {
          socket.emit('auctionError', 'Auction data is no longer valid');
          return;
        }

        if (captain.budget < liveAuction.currentBid) {
          socket.emit('auctionError', 'Winning captain no longer has enough budget');
          return;
        }

        captain.budget -= liveAuction.currentBid;
        captain.totalSpent += liveAuction.currentBid;
        captain.players.push(player._id);
        await captain.save();

        player.status = 'sold';
        await player.save();

        await Auction.findByIdAndUpdate(liveAuction.id, {
          status: 'sold',
          soldFor: liveAuction.currentBid,
          soldTo: captain._id,
          endsAt: new Date()
        });

        io.to(AUCTION_ROOM).emit('playerSold', {
          player,
          soldFor: liveAuction.currentBid,
          soldTo: {
            id: captain._id.toString(),
            name: captain.name
          }
        });

        await emitLeaderboard(io);
        resetAuction();
        await emitSnapshot(io);
      } catch (error) {
        socket.emit('auctionError', error.message);
      }
    });

    socket.on('auctionClosed', async () => {
      try {
        if (socket.data.user?.role !== 'admin') {
          socket.emit('auctionError', 'Only admins can close auctions');
          return;
        }

        await closeAuctionInternally(io, 'admin-closed');
        await emitSnapshot(io);
      } catch (error) {
        socket.emit('auctionError', error.message);
      }
    });

    socket.on('disconnect', () => {
      socket.leave(AUCTION_ROOM);
    });
  });
};
