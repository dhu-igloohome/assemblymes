import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 5: Production Execution ---');

  const wos = await prisma.workOrder.findMany({
    where: { workOrderNo: { in: ['WO-SO-001', 'WO-SO-002'] } },
  });

  const fgLocation = await prisma.storageLocation.findFirst({
    where: { locationCode: 'FG-STORE', warehouse: { warehouseCode: 'SZ-FACTORY' } },
  });
  if (!fgLocation) throw new Error('FG-STORE location not found');

  for (const wo of wos) {
    console.log(`Processing WO: ${wo.workOrderNo}`);

    // 1. Release Work Order (Triggers material issue and ops creation)
    // We'll simulate the service call logic here to be safe
    await prisma.$transaction(async (tx) => {
        // Create Ops from Routing
        const routing = await tx.routingHeader.findFirst({
            where: { itemCode: wo.skuItemCode },
            include: { operations: true },
        });

        if (routing) {
            for (const op of routing.operations) {
                await tx.workOrderOperation.upsert({
                    where: { workOrderId_sequence: { workOrderId: wo.id, sequence: op.sequence } },
                    create: {
                        workOrderId: wo.id,
                        sequence: op.sequence,
                        operationName: op.operationName,
                        workstation: op.workstation,
                        standardTimeSec: op.standardTimeSec,
                        isInspectionPoint: op.isInspectionPoint,
                        inspectionStandard: op.inspectionStandard,
                        status: 'PENDING',
                    },
                    update: {}
                });
            }
        }

        // Issue Materials (simplified for rehearsal: just assume they are issued from RAW-MAT)
        const bom = await tx.bomHeader.findFirst({
            where: { parentItemCode: wo.skuItemCode, isActive: true },
            include: { lines: true }
        });

        if (bom) {
            const rawMatLocation = await tx.storageLocation.findFirst({ where: { locationCode: 'RAW-MAT' } });
            for (const line of bom.lines) {
                const qty = Number(line.quantity) * wo.plannedQty;
                // Update Balance
                await tx.inventoryBalance.update({
                    where: { itemCode_locationId: { itemCode: line.componentItemCode, locationId: rawMatLocation.id } },
                    data: { quantity: { decrement: qty } }
                });
                // Record Txn
                const itxn = await tx.inventoryTxn.create({
                    data: {
                        txnType: 'OUT',
                        itemCode: line.componentItemCode,
                        quantity: qty,
                        fromLocationId: rawMatLocation.id,
                        refType: 'WORK_ORDER',
                        refNo: wo.workOrderNo,
                        operator: 'Wh-Agent',
                    }
                });
                await tx.workOrderMaterialTxn.create({
                    data: {
                        workOrderId: wo.id,
                        inventoryTxnId: itxn.id,
                        mode: 'ISSUE',
                        itemCode: line.componentItemCode,
                        locationId: rawMatLocation.id,
                        quantity: qty,
                        operator: 'Wh-Agent',
                    }
                });
            }
        }

        // Update WO Status
        await tx.workOrder.update({
            where: { id: wo.id },
            data: { status: 'RELEASED' }
        });
    }, { timeout: 30000 });
    console.log(`  WO ${wo.workOrderNo} Released & Materials Issued.`);

    // 2. Report Production for each Op
    const ops = await prisma.workOrderOperation.findMany({
        where: { workOrderId: wo.id },
        orderBy: { sequence: 'asc' }
    });

    for (const op of ops) {
        console.log(`  Reporting Op: ${op.operationName}`);
        const goodQty = wo.plannedQty;
        const timeSpent = op.standardTimeSec * goodQty;

        await prisma.$transaction(async (tx) => {
            // Create Report
            const report = await tx.productionReport.create({
                data: {
                    workOrderOperationId: op.id,
                    operator: 'Prod-Agent',
                    goodQty,
                    timeSpentSec: timeSpent,
                }
            });

            // Update Op
            await tx.workOrderOperation.update({
                where: { id: op.id },
                data: {
                    completedQty: goodQty,
                    status: 'COMPLETED',
                    startedAt: new Date(),
                    completedAt: new Date(),
                }
            });

            // Cost Entry
            await tx.costEntry.createMany({
                data: [
                    {
                        workOrderId: wo.id,
                        entryType: 'LABOR',
                        amount: timeSpent * 0.5,
                        sourceType: 'PRODUCTION_REPORT',
                        sourceRef: report.id,
                        createdBy: 'System-Cost',
                    },
                    {
                        workOrderId: wo.id,
                        entryType: 'OVERHEAD',
                        amount: timeSpent * 0.8,
                        sourceType: 'PRODUCTION_REPORT',
                        sourceRef: report.id,
                        createdBy: 'System-Cost',
                    }
                ]
            });

            // If last op, receive FG
            const isLast = ops[ops.length - 1].id === op.id;
            if (isLast) {
                await tx.inventoryBalance.upsert({
                    where: { itemCode_locationId: { itemCode: wo.skuItemCode, locationId: fgLocation.id } },
                    create: { itemCode: wo.skuItemCode, locationId: fgLocation.id, quantity: goodQty },
                    update: { quantity: { increment: goodQty } }
                });
                const itxn = await tx.inventoryTxn.create({
                    data: {
                        txnType: 'IN',
                        itemCode: wo.skuItemCode,
                        quantity: goodQty,
                        toLocationId: fgLocation.id,
                        refType: 'PRODUCTION_REPORT_FG',
                        refNo: report.id,
                        operator: 'Wh-Agent',
                    }
                });
                // FQC
                await tx.qualityInspection.create({
                    data: {
                        inspectionNo: `FQC-${wo.workOrderNo}-${Date.now()}`,
                        stage: 'OQC',
                        result: 'PASS',
                        itemCode: wo.skuItemCode,
                        workOrderNo: wo.workOrderNo,
                        sampleSize: goodQty,
                        defectQty: 0,
                        inspectedBy: 'QA-Agent',
                        inspectedAt: new Date(),
                    }
                });
                // Update WO to DONE
                await tx.workOrder.update({
                    where: { id: wo.id },
                    data: { status: 'DONE' }
                });
            } else {
                // Update WO to IN_PROGRESS
                await tx.workOrder.update({
                    where: { id: wo.id },
                    data: { status: 'IN_PROGRESS' }
                });
            }
        }, { timeout: 30000 });
    }
    console.log(`  WO ${wo.workOrderNo} Completed.`);
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
