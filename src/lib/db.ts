import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with proper options
// Note: Prisma doesn't accept connectionLimit directly as a configuration option
export const prisma = global.prisma || new PrismaClient({
  log: ['error', 'warn'],
});

// Save reference in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}