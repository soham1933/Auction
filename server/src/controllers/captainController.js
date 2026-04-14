import Captain from '../models/Captain.js';

export const listCaptains = async (_req, res) => {
  const captains = await Captain.find().populate('players').sort({ name: 1 });
  res.json(captains);
};

export const getLeaderboard = async (_req, res) => {
  const captains = await Captain.find().populate('players');

  const leaderboard = captains
    .map((captain) => ({
      id: captain._id,
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

