import { getPrisma } from '../config/prisma.js';
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
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true },
    orderBy: { name: 'asc' }
  });

  return captains
    .map((captain) => ({
      id: captain.id,
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
  const prisma = getPrisma();

  if (liveAuction.id) {
    await prisma.auction.update({
      where: { id: liveAuction.id },
      data: {
        status: 'closed',
        endsAt: new Date()
      }
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
  const prisma = getPrisma();

  if (liveAuction.id) {
    await prisma.auction.update({
      where: { id: liveAuction.id },
      data: {
        status: 'awaiting-close',
        endsAt: new Date()
      }
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

        const prisma = getPrisma();
        const player = await prisma.player.findUnique({ where: { id: playerId } });

        if (!player) {
          socket.emit('auctionError', 'Player not found');
          return;
        }

        clearAuctionTimer();

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + Number(duration) * 1000);

        const auctionDoc = await prisma.auction.create({
          data: {
            currentPlayerId: player.id,
            currentBid: player.basePrice,
            status: 'live',
            startedAt: startTime,
            endsAt: endTime,
            bidHistory: [
              {
                amount: player.basePrice,
                bidderName: 'Opening Price',
                createdAt: startTime.toISOString()
              }
            ]
          }
        });

        liveAuction = {
          id: auctionDoc.id,
          currentPlayer: player,
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
          socket.emit('auctionError', `Bid must be at least ${minimumAllowed}`);
          return;
        }

        const prisma = getPrisma();
        const captain = await prisma.captain.findUnique({ where: { id: socket.data.user.id } });

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
          id: captain.id,
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

        await prisma.auction.update({
          where: { id: liveAuction.id },
          data: {
            currentBid: bidAmount,
            highestBidderId: captain.id
          }
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
        const prisma = getPrisma();

        const captain = await prisma.captain.findUnique({ where: { id: liveAuction.highestBidder.id } });
        const player = await prisma.player.findUnique({ where: { id: liveAuction.currentPlayer.id } });

        if (!captain || !player) {
          socket.emit('auctionError', 'Auction data is no longer valid');
          return;
        }

        if (captain.budget < liveAuction.currentBid) {
          socket.emit('auctionError', 'Winning captain no longer has enough budget');
          return;
        }

        await prisma.captain.update({
          where: { id: captain.id },
          data: {
            budget: captain.budget - liveAuction.currentBid,
            totalSpent: captain.totalSpent + liveAuction.currentBid,
            players: {
              connect: { id: player.id }
            }
          }
        });

        await prisma.player.update({
          where: { id: player.id },
          data: {
            status: 'sold',
            captainId: captain.id
          }
        });

        await prisma.auction.update({
          where: { id: liveAuction.id },
          data: {
            status: 'sold',
            soldFor: liveAuction.currentBid,
            soldToId: captain.id,
            endsAt: new Date()
          }
        });

        io.to(AUCTION_ROOM).emit('playerSold', {
          player,
          soldFor: liveAuction.currentBid,
          soldTo: {
            id: captain.id,
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
