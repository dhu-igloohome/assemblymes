import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const woCount = await prisma.workOrder.count();
  const woList = await prisma.workOrder.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { workOrderNo: true, skuItemCode: true, status: true }
  });
  console.log('Total Work Orders:', woCount);
  console.log('Recent Work Orders:', woList);
}

main().finally(() => prisma.$disconnect());
