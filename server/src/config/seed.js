import bcrypt from 'bcryptjs';
import { getPrisma } from './prisma.js';

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
  const prisma = getPrisma();
  const captainCount = await prisma.captain.count();
  const playerCount = await prisma.player.count();

  if (captainCount === 0) {
    for (const captain of demoCaptains) {
      await prisma.captain.create({
        data: {
          name: captain.name,
          password: await bcrypt.hash(captain.password, 10)
        }
      });
    }
    console.log('Seeded demo captains');
  }

  if (playerCount === 0) {
    for (const player of demoPlayers) {
      await prisma.player.create({
        data: {
          name: player.name,
          role: player.role,
          basePrice: player.basePrice,
          team: player.team,
          country: player.country
        }
      });
    }
    console.log('Seeded demo players');
  }
};
