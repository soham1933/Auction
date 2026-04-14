import Player from '../models/Player.js';

export const listPlayers = async (_req, res) => {
  const players = await Player.find().sort({ createdAt: -1 });
  res.json(players);
};

export const createPlayer = async (req, res) => {
  const player = await Player.create(req.body);
  res.status(201).json(player);
};

export const updatePlayer = async (req, res) => {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  });

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  return res.json(player);
};

