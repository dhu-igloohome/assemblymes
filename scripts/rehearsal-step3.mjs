import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 3: Run MRP / Auto Plan (Robust) ---');

  const sos = await prisma.salesOrder.findMany({
    where: { orderNo: { in: ['SO-001', 'SO-002'] } },
  });

  for (const so of sos) {
    console.log(`Processing ${so.orderNo}...`);
    
    // Check if Work Order already exists
    let wo = await prisma.workOrder.findUnique({ where: { workOrderNo: `WO-${so.orderNo}` } });
    if (!wo) {
      wo = await prisma.workOrder.create({
        data: {
          workOrderNo: `WO-${so.orderNo}`,
          salesOrderId: so.id,
          skuItemCode: so.skuItemCode,
          batchNo: `${so.orderNo}-B1`,
          plannedQty: so.orderedQty,
          status: 'PLANNED',
          planStartDate: new Date(),
          planEndDate: so.dueDate,
          createdBy: 'MRP-System',
          notes: 'Auto-created by rehearsal MRP',
        },
      });
      console.log(`  Created Work Order: ${wo.workOrderNo}`);
    } else {
      console.log(`  Work Order ${wo.workOrderNo} already exists.`);
    }

    // Explode BOM & Create POs
    const activeBom = await prisma.bomHeader.findFirst({
      where: { parentItemCode: so.skuItemCode, isActive: true },
      include: { lines: true },
    });

    if (activeBom) {
      const supplier = await prisma.supplier.findFirst({
        where: { supplierCode: { startsWith: 'SUP-' } },
      });

      if (!supplier) throw new Error('NO_SUPPLIER_FOUND');

      let lineIdx = 0;
      for (const line of activeBom.lines) {
        const poNo = `PO-${so.orderNo}-${String(lineIdx + 1).padStart(2, '0')}`;
        const existingPo = await prisma.purchaseOrder.findUnique({ where: { poNo } });
        
        if (!existingPo) {
          const required = Number(line.quantity) * so.orderedQty;
          await prisma.purchaseOrder.create({
            data: {
              poNo,
              salesOrderId: so.id,
              supplierId: supplier.id,
              status: 'DRAFT',
              currency: so.currency,
              expectedDate: so.dueDate,
              createdBy: 'MRP-System',
              lines: {
                create: {
                  itemCode: line.componentItemCode,
                  orderedQty: required,
                  unitPrice: 10.0,
                },
              },
            },
          });
          console.log(`  Created PO: ${poNo}`);
        } else {
          console.log(`  PO ${poNo} already exists.`);
        }
        lineIdx++;
      }
    }

    await prisma.mrpRun.upsert({
        where: { id: `mrp-${so.orderNo}` }, // Fake ID for rehearsal upsert if we had it, but mrpRun doesn't have a unique other than ID.
        // Let's just create a new one.
        create: {
          salesOrderId: so.id,
          triggeredBy: 'rehearsal',
          status: 'DONE',
          summary: 'Rehearsal MRP Run Successful',
        },
        update: {}
    }).catch(() => {
        // Fallback for mrpRun since it doesn't have a stable unique key in schema yet
        return prisma.mrpRun.create({
            data: {
                salesOrderId: so.id,
                triggeredBy: 'rehearsal',
                status: 'DONE',
                summary: 'Rehearsal MRP Run Successful',
            }
        });
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
