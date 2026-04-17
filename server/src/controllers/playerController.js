import { getPrisma } from '../config/prisma.js';

export const listPlayers = async (_req, res) => {
  const prisma = getPrisma();
  const players = await prisma.player.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(players);
};

export const createPlayer = async (req, res) => {
  const prisma = getPrisma();
  const playerData = {
    name: req.body.name,
    role: req.body.role,
    basePrice: Number(req.body.basePrice) || 0,
    team: req.body.team || '',
    country: req.body.country || '',
    avatarUrl: req.body.avatarUrl || '',
    bannerUrl: req.body.bannerUrl || '',
    imageUrl: req.body.imageUrl || '',
    status: req.body.status || 'available'
  };

  const player = await prisma.player.create({ data: playerData });
  res.status(201).json(player);
};

export const updatePlayer = async (req, res) => {
  const prisma = getPrisma();
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  const updatedData = {
    name: req.body.name ?? player.name,
    role: req.body.role ?? player.role,
    basePrice: req.body.basePrice !== undefined ? Number(req.body.basePrice) : player.basePrice,
    team: req.body.team ?? player.team,
    country: req.body.country ?? player.country,
    avatarUrl: req.body.avatarUrl ?? player.avatarUrl,
    bannerUrl: req.body.bannerUrl ?? player.bannerUrl,
    imageUrl: req.body.imageUrl ?? player.imageUrl,
    status: req.body.status ?? player.status
  };

  const updatedPlayer = await prisma.player.update({
    where: { id: req.params.id },
    data: updatedData
  });

  return res.json(updatedPlayer);
};

export const deletePlayer = async (req, res) => {
  const prisma = getPrisma();
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  if (player.status === 'sold') {
    return res.status(400).json({ message: 'Cannot delete a sold player' });
  }

  if (player.captainId) {
    return res.status(400).json({ message: 'Cannot delete: player is on a team' });
  }

  await prisma.player.delete({ where: { id: player.id } });

  return res.json({ ok: true });
};
