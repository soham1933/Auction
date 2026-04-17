import { getPrisma } from '../config/prisma.js';

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const asString = String(value);
  if (/[",\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
};

const writeCsv = (rows) => rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

export const exportPlayersCsv = async (_req, res) => {
  const prisma = getPrisma();
  const players = await prisma.player.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const rows = [
    ['id', 'name', 'role', 'basePrice', 'status', 'team', 'country', 'avatarUrl', 'bannerUrl', 'imageUrl', 'createdAt'],
    ...players.map((player) => [
      player.id,
      player.name,
      player.role,
      player.basePrice,
      player.status,
      player.team || '',
      player.country || '',
      player.avatarUrl || '',
      player.bannerUrl || '',
      player.imageUrl || '',
      player.createdAt.toISOString()
    ])
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="players.csv"');
  res.send(writeCsv(rows));
};

export const exportCaptainsCsv = async (_req, res) => {
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true },
    orderBy: { name: 'asc' }
  });

  const rows = [
    ['id', 'name', 'budget', 'totalSpent', 'playersBought', 'playerNames'],
    ...captains.map((captain) => [
      captain.id,
      captain.name,
      captain.budget,
      captain.totalSpent,
      captain.players.length,
      captain.players.map((player) => player.name).join(' | ')
    ])
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="captains.csv"');
  res.send(writeCsv(rows));
};

export const exportTeamsCsv = async (_req, res) => {
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true },
    orderBy: { name: 'asc' }
  });

  const rows = [
    [
      'captainId',
      'captainName',
      'budget',
      'totalSpent',
      'playerId',
      'playerName',
      'role',
      'basePrice',
      'team',
      'country'
    ],
    ...captains.flatMap((captain) => {
      if (!captain.players.length) {
        return [[captain.id, captain.name, captain.budget, captain.totalSpent, '', '', '', '', '', '']];
      }

      return captain.players.map((player) => [
        captain.id,
        captain.name,
        captain.budget,
        captain.totalSpent,
        player.id,
        player.name,
        player.role,
        player.basePrice,
        player.team || '',
        player.country || ''
      ]);
    })
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="teams.csv"');
  res.send(writeCsv(rows));
};

export const exportAuctionsCsv = async (_req, res) => {
  const prisma = getPrisma();
  const auctions = await prisma.auction.findMany({
    include: {
      currentPlayer: true,
      highestBidder: true,
      soldTo: true
    },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  const rows = [
    [
      'id',
      'status',
      'playerName',
      'currentBid',
      'highestBidder',
      'soldTo',
      'soldFor',
      'startedAt',
      'endsAt',
      'createdAt'
    ],
    ...auctions.map((auction) => [
      auction.id,
      auction.status,
      auction.currentPlayer?.name || '',
      auction.currentBid,
      auction.highestBidder?.name || '',
      auction.soldTo?.name || '',
      auction.soldFor || 0,
      auction.startedAt?.toISOString() || '',
      auction.endsAt?.toISOString() || '',
      auction.createdAt.toISOString()
    ])
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="auctions.csv"');
  res.send(writeCsv(rows));
};

