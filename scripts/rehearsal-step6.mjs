import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 6: Sales Shipment (EXW) ---');

  const sos = await prisma.salesOrder.findMany({
    where: { orderNo: { in: ['SO-001', 'SO-002'] } },
  });

  const fgLocation = await prisma.storageLocation.findFirst({
    where: { locationCode: 'FG-STORE', warehouse: { warehouseCode: 'SZ-FACTORY' } },
  });

  if (!fgLocation) throw new Error('FG-STORE location not found');

  for (const so of sos) {
    console.log(`Shipping SO: ${so.orderNo}`);

    await prisma.$transaction(async (tx) => {
        const shipQty = so.orderedQty;

        // 1. Create Shipment
        const shipment = await tx.shipment.create({
            data: {
                shipmentNo: `SHIP-${so.orderNo}`,
                salesOrderId: so.id,
                shippedQty: shipQty,
                status: 'POSTED',
                shippedAt: new Date(),
                postedAt: new Date(),
                warehouseCode: 'SZ-FACTORY',
                locationId: fgLocation.id,
                logisticsNo: 'EXW-BUYER-PICKUP',
                remarks: 'EXW Singapore, Picked up by Johnny',
                createdBy: 'Sales-Assistant',
                operator: 'Wh-Agent',
            }
        });

        // 2. Reduce FG Stock
        await tx.inventoryBalance.update({
            where: { itemCode_locationId: { itemCode: so.skuItemCode, locationId: fgLocation.id } },
            data: { quantity: { decrement: shipQty } }
        });

        // 3. Record Inventory Txn
        await tx.inventoryTxn.create({
            data: {
                txnType: 'OUT',
                itemCode: so.skuItemCode,
                quantity: shipQty,
                fromLocationId: fgLocation.id,
                refType: 'SALES_ORDER',
                refNo: so.orderNo,
                operator: 'Wh-Agent',
                remarks: `Shipment ${shipment.shipmentNo}`,
            }
        });

        // 4. Update SO Status to CLOSED (since it's fully shipped)
        await tx.salesOrder.update({
            where: { id: so.id },
            data: { status: 'CLOSED' }
        });
    }, { timeout: 30000 });

    console.log(`  SO ${so.orderNo} Shipped and Closed.`);
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
