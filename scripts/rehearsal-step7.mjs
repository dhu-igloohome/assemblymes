import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 7: Final Verification & Report ---');

  // 1. Sales Orders
  const sos = await prisma.salesOrder.findMany({
    where: { orderNo: { in: ['SO-001', 'SO-002'] } }
  });
  console.log('\n--- Sales Orders Status ---');
  sos.forEach(so => console.log(`Order ${so.orderNo}: ${so.status}`));

  // 2. Work Orders
  const wos = await prisma.workOrder.findMany({
    where: { workOrderNo: { in: ['WO-SO-001', 'WO-SO-002'] } }
  });
  console.log('\n--- Work Orders Status ---');
  wos.forEach(wo => console.log(`Work Order ${wo.workOrderNo}: ${wo.status}`));

  // 3. Inventory Balances
  const balances = await prisma.inventoryBalance.findMany({
    where: { 
        location: { 
            warehouse: { warehouseCode: 'SZ-FACTORY' }
        }
    },
    include: { location: true }
  });
  console.log('\n--- Inventory Balances (SZ-FACTORY) ---');
  if (balances.length === 0) console.log('All balances are 0 or no records found.');
  balances.forEach(b => console.log(`Item ${b.itemCode} at ${b.location.locationCode}: ${b.quantity}`));

  // 4. Quality Inspections
  const iqc = await prisma.qualityInspection.count({ where: { stage: 'IQC' } });
  const ipqc = await prisma.qualityInspection.count({ where: { stage: 'IPQC' } });
  const oqc = await prisma.qualityInspection.count({ where: { stage: 'OQC' } });
  console.log('\n--- Quality Inspections ---');
  console.log(`IQC Records: ${iqc}`);
  console.log(`IPQC Records: ${ipqc}`);
  console.log(`OQC Records: ${oqc}`);

  // 5. Cost Entries
  const totalLabor = await prisma.costEntry.aggregate({
    _sum: { amount: true },
    where: { entryType: 'LABOR' }
  });
  const totalOverhead = await prisma.costEntry.aggregate({
    _sum: { amount: true },
    where: { entryType: 'OVERHEAD' }
  });
  console.log('\n--- Cost Summary ---');
  console.log(`Total Labor Cost: ${totalLabor._sum.amount}`);
  console.log(`Total Overhead Cost: ${totalOverhead._sum.amount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
