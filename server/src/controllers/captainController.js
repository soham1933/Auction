import bcrypt from 'bcryptjs';
import { getPrisma } from '../config/prisma.js';

export const createCaptain = async (req, res) => {
  const { name, password, team } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name and password are required' });
  }

  const prisma = getPrisma();
  const existingCaptain = await prisma.captain.findUnique({
    where: { name }
  });

  if (existingCaptain) {
    return res.status(400).json({ message: 'Captain name already exists' });
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  const avatarUrl = req.file
    ? `${origin}/uploads/captain-images/${req.file.filename}`
    : null;

  const hashedPassword = await bcrypt.hash(password, 10);

  const captain = await prisma.captain.create({
    data: {
      name,
      password: hashedPassword,
      team: team || '',
      avatarUrl,
      imageUrl: avatarUrl
    },
    include: {
      players: true
    }
  });

  res.status(201).json(captain);
};

export const listCaptains = async (_req, res) => {
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true },
    orderBy: { name: 'asc' }
  });
  res.json(captains);
};

export const getLeaderboard = async (_req, res) => {
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true }
  });

  const leaderboard = captains
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

  res.json(leaderboard);
};

export const getTeamsOverview = async (_req, res) => {
  const prisma = getPrisma();
  const captains = await prisma.captain.findMany({
    include: { players: true },
    orderBy: { name: 'asc' }
  });

  const teams = captains.map((captain) => ({
    id: captain.id,
    name: captain.name,
    budget: captain.budget,
    totalSpent: captain.totalSpent,
    playersBought: captain.players.length,
    players: captain.players
  }));

  res.json(teams);
};
