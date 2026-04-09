import { PrismaClient } from '@prisma/client';
import { runAutoPlanForSalesOrder, autoIssueMaterialsForWorkOrder } from '../src/lib/services/sales-order-automation.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Full Flow Simulation ---');

  // 1. Identify Product and ensure basic setup
  const productCode = 'IGB4MT'; // Mortise Touch
  const product = await prisma.item.findUnique({ where: { itemCode: productCode } });
  if (!product) {
    console.error('Product IGB4MT not found. Please run seed script first.');
    return;
  }

  // 2. Create Sales Order
  const orderNo = `SO-SIM-${Date.now().toString().slice(-6)}`;
  console.log(`Creating Sales Order: ${orderNo}`);
  const so = await prisma.salesOrder.create({
    data: {
      orderNo,
      customerName: 'Igloohome Singapore HQ',
      skuItemCode: productCode,
      orderedQty: 50,
      unitPrice: 875.00,
      currency: 'USD',
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedBy: 'simulation-bot',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  // 3. Run MRP (Auto Plan)
  console.log('Running MRP for the Sales Order...');
  const planResult = await runAutoPlanForSalesOrder(so.id, 'simulation-bot');
  console.log('MRP Result:', planResult);
  const woId = planResult.workOrderId;
  const wo = await prisma.workOrder.findUnique({ where: { id: woId } });
  console.log(`Work Order Created: ${wo.workOrderNo}`);

  // 4. Mock Material Inflow (Inventory for components)
  console.log('Mocking Material Inflow for components...');
  const bom = await prisma.bomHeader.findFirst({
    where: { parentItemCode: productCode, isActive: true },
    include: { lines: true }
  });

  const rawWh = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-RAW' },
    update: {},
    create: { warehouseCode: 'WH-RAW', name: 'Raw Material Warehouse' }
  });
  const rawLoc = await prisma.storageLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: rawWh.id, locationCode: 'LOC-RAW-1' } },
    update: { isActive: true },
    create: { warehouseId: rawWh.id, locationCode: 'LOC-RAW-1', name: 'Raw Bin 1' }
  });

  for (const line of bom.lines) {
    const qty = line.quantity.toNumber() * 50;
    await prisma.inventoryBalance.upsert({
      where: { itemCode_locationId: { itemCode: line.componentItemCode, locationId: rawLoc.id } },
      update: { quantity: { increment: qty } },
      create: { itemCode: line.componentItemCode, locationId: rawLoc.id, quantity: qty }
    });
    console.log(`Added ${qty} of ${line.componentItemCode} to inventory.`);
  }

  // 5. Release Work Order and Issue Materials
  console.log('Releasing Work Order and Issuing Materials...');
  await prisma.workOrder.update({
    where: { id: woId },
    data: { status: 'RELEASED' }
  });
  const issueResult = await autoIssueMaterialsForWorkOrder(woId, 'simulation-bot');
  console.log('Material Issue Result:', issueResult);

  // 6. Start Production & Report some quantity
  console.log('Reporting Production for first 2 operations...');
  const ops = await prisma.workOrderOperation.findMany({
    where: { workOrderId: woId },
    orderBy: { sequence: 'asc' }
  });

  for (let i = 0; i < 2; i++) {
    const op = ops[i];
    await prisma.productionReport.create({
      data: {
        workOrderOperationId: op.id,
        operator: 'Operator-A',
        goodQty: 20,
        scrapQty: 1,
        timeSpentSec: 1200,
        remarks: 'Simulation report'
      }
    });
    await prisma.workOrderOperation.update({
      where: { id: op.id },
      data: { 
        completedQty: 20,
        status: 'STARTED',
        startedAt: new Date()
      }
    });
    console.log(`Reported 20 units for operation: ${op.operationName}`);
  }

  // 7. Create an active Andon Issue
  console.log('Creating an active Andon Issue...');
  await prisma.issueRecord.create({
    data: {
      issueType: 'QUALITY',
      description: 'Component scratching detected on assembly line',
      workOrderId: woId,
      operationId: ops[1].id,
      workCenterCode: ops[1].workstation,
      reporter: 'QC-Inspector',
      status: 'OPEN'
    }
  });

  // 8. Update Safety Stock for an item to trigger alert
  console.log('Triggering a low stock alert...');
  await prisma.item.update({
    where: { itemCode: 'PCBA01' },
    data: { safetyStock: 1000 } // Setting high to trigger alert since we only have 50-100
  });

  console.log('--- Simulation Completed Successfully ---');
  console.log('You can now check the Dashboard for:');
  console.log('1. Active Andon (1)');
  console.log('2. Today Output (40 PCS - 20 from each of 2 ops)');
  console.log('3. Inventory Alert (1)');
  console.log(`4. Recent Order (${orderNo})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
