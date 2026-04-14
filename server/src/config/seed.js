import Captain from '../models/Captain.js';
import Player from '../models/Player.js';

const demoCaptains = [
  { name: 'Mumbai Mavericks', password: 'captain123' },
  { name: 'Chennai Chargers', password: 'captain123' },
  { name: 'Delhi Daredevils', password: 'captain123' },
  { name: 'Bangalore Blasters', password: 'captain123' }
];

const demoPlayers = [
  {
    name: 'Virat Kohli',
    role: 'Batter',
    basePrice: 1500,
    team: 'India',
    country: 'India'
  },
  {
    name: 'Jasprit Bumrah',
    role: 'Bowler',
    basePrice: 1400,
    team: 'India',
    country: 'India'
  },
  {
    name: 'Rashid Khan',
    role: 'All-Rounder',
    basePrice: 1300,
    team: 'Afghanistan',
    country: 'Afghanistan'
  },
  {
    name: 'Jos Buttler',
    role: 'Wicket-Keeper',
    basePrice: 1250,
    team: 'England',
    country: 'England'
  },
  {
    name: 'Pat Cummins',
    role: 'Bowler',
    basePrice: 1200,
    team: 'Australia',
    country: 'Australia'
  },
  {
    name: 'Glenn Maxwell',
    role: 'All-Rounder',
    basePrice: 1100,
    team: 'Australia',
    country: 'Australia'
  }
];

export const seedDemoData = async () => {
  const captainCount = await Captain.countDocuments();
  const playerCount = await Player.countDocuments();

  if (captainCount === 0) {
    for (const captain of demoCaptains) {
      await Captain.create(captain);
    }
    console.log('Seeded demo captains');
  } else {
    const captains = await Captain.find();

    for (const captain of captains) {
      if (captain.password && !captain.password.startsWith('$2')) {
        captain.password = captain.password;
        await captain.save();
      }
    }
  }

  if (playerCount === 0) {
    await Player.insertMany(demoPlayers);
    console.log('Seeded demo players');
  }
};
