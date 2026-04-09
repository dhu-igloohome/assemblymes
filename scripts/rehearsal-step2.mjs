import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 2: Create Sales Orders ---');

  const dueDate = new Date('2026-06-09');

  const so1 = await prisma.salesOrder.upsert({
    where: { orderNo: 'SO-001' },
    update: { status: 'CONFIRMED' },
    create: {
      orderNo: 'SO-001',
      customerName: 'igloohome',
      skuItemCode: 'IGB4E1',
      orderedQty: 5210,
      unitPrice: 45.0,
      currency: 'USD',
      dueDate,
      status: 'CONFIRMED',
      notes: 'EXW Singapore, Contact: Johnny +65 3159 1352',
      createdBy: 'Zhang San',
    },
  });
  console.log('SO-001 created/confirmed.');

  const so2 = await prisma.salesOrder.upsert({
    where: { orderNo: 'SO-002' },
    update: { status: 'CONFIRMED' },
    create: {
      orderNo: 'SO-002',
      customerName: 'igloohome',
      skuItemCode: 'IGB4E1',
      orderedQty: 5210,
      unitPrice: 45.0,
      currency: 'USD',
      dueDate,
      status: 'CONFIRMED',
      notes: 'EXW Singapore, Contact: Johnny +65 3159 1352',
      createdBy: 'Li Si',
    },
  });
  console.log('SO-002 created/confirmed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
