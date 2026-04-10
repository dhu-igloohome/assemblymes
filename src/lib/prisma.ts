import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = process.env.DATABASE_URL || '';
const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'local/unknown';

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
});

console.log(`[Prisma] Initialized - DB Host: ${dbHost}`);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma