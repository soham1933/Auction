import { PrismaClient } from '@prisma/client';

let prisma;

export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
};

