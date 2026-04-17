import { getPrisma } from './prisma.js';

export const connectDB = async () => {
  const prisma = getPrisma();
  await prisma.$connect();
  console.log('Postgres connected');
};

