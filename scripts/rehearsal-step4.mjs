import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 4: Procurement Execution ---');

  const rawMatLocation = await prisma.storageLocation.findFirst({
    where: { locationCode: 'RAW-MAT', warehouse: { warehouseCode: 'SZ-FACTORY' } },
  });

  if (!rawMatLocation) throw new Error('RAW-MAT location not found');

  const pos = await prisma.purchaseOrder.findMany({
    where: { poNo: { startsWith: 'PO-SO-' }, status: 'DRAFT' },
    include: { lines: true },
  });

  for (const po of pos) {
    console.log(`Processing PO: ${po.poNo}`);

    // 1. Confirm PO
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'CONFIRMED', confirmedBy: 'Procurement-Agent', confirmedAt: new Date() },
    });

    // 2. Receive each line
    for (const line of po.lines) {
      const receiveQty = line.orderedQty;
      
      await prisma.$transaction(async (tx) => {
        // Create Inventory Transaction
        const txn = await tx.inventoryTxn.create({
          data: {
            txnType: 'IN',
            itemCode: line.itemCode,
            quantity: receiveQty,
            toLocationId: rawMatLocation.id,
            refType: 'PURCHASE_ORDER',
            refNo: po.poNo,
            operator: 'Wh-Agent',
            remarks: 'Rehearsal Receipt',
          },
        });

        // Update Balance
        const bal = await tx.inventoryBalance.findUnique({
          where: { itemCode_locationId: { itemCode: line.itemCode, locationId: rawMatLocation.id } },
        });
        const current = bal?.quantity || 0;
        await tx.inventoryBalance.upsert({
          where: { itemCode_locationId: { itemCode: line.itemCode, locationId: rawMatLocation.id } },
          create: { itemCode: line.itemCode, locationId: rawMatLocation.id, quantity: receiveQty },
          update: { quantity: Number(current) + Number(receiveQty) },
        });

        // Record Receipt
        await tx.purchaseReceipt.create({
          data: {
            purchaseOrderId: po.id,
            lineId: line.id,
            inventoryTxnId: txn.id,
            locationId: rawMatLocation.id,
            receivedQty: receiveQty,
            operator: 'Wh-Agent',
          },
        });

        // Update Line
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQty: { increment: receiveQty } },
        });

        // Create IQC Task (Auto Pass for rehearsal)
        await tx.qualityInspection.create({
          data: {
            inspectionNo: `IQC-${po.poNo}-${line.itemCode}`,
            stage: 'IQC',
            result: 'PASS',
            itemCode: line.itemCode,
            sampleSize: Math.ceil(Number(receiveQty) * 0.05),
            defectQty: 0,
            inspectedBy: 'QA-Agent',
            inspectedAt: new Date(),
            disposition: 'Bulk Rehearsal Pass',
          },
        });
      });
      console.log(`  Received ${receiveQty} of ${line.itemCode}`);
    }

    // 3. Close PO if all received
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'RECEIVED' },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
