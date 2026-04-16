import Player from '../models/Player.js';
import Captain from '../models/Captain.js';
import { getPrisma } from '../config/prisma.js';

export const listPlayers = async (_req, res) => {
  const players = await Player.find().sort({ createdAt: -1 });
  res.json(players);
};

export const createPlayer = async (req, res) => {
  const player = await Player.create(req.body);

  if (player.imageUrl) {
    try {
      const prisma = getPrisma();
      await prisma.playerImage.upsert({
        where: { playerId: player._id.toString() },
        create: { playerId: player._id.toString(), imageUrl: player.imageUrl },
        update: { imageUrl: player.imageUrl }
      });
    } catch (_error) {
      // If Prisma isn't configured yet, the app should still work using Mongoose's imageUrl field.
    }
  }

  res.status(201).json(player);
};

export const updatePlayer = async (req, res) => {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  });

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  if (typeof player.imageUrl === 'string' && player.imageUrl.length > 0) {
    try {
      const prisma = getPrisma();
      await prisma.playerImage.upsert({
        where: { playerId: player._id.toString() },
        create: { playerId: player._id.toString(), imageUrl: player.imageUrl },
        update: { imageUrl: player.imageUrl }
      });
    } catch (_error) {
      // ok
    }
  }

  return res.json(player);
};

export const deletePlayer = async (req, res) => {
  const player = await Player.findById(req.params.id);

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  if (player.status === 'sold') {
    return res.status(400).json({ message: 'Cannot delete a sold player' });
  }

  const isOwned = await Captain.exists({ players: player._id });
  if (isOwned) {
    return res.status(400).json({ message: 'Cannot delete: player is on a team' });
  }

  await Player.findByIdAndDelete(player._id);

  try {
    const prisma = getPrisma();
    await prisma.playerImage.delete({ where: { playerId: player._id.toString() } });
  } catch (_error) {
    // ok if prisma isn't configured or record doesn't exist
  }

  return res.json({ ok: true });
};
