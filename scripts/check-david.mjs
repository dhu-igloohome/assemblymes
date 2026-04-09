import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.systemUser.findUnique({
    where: { username: 'david' },
    include: { employee: true }
  });
  console.log('User david:', user);
}

main().finally(() => prisma.$disconnect());
