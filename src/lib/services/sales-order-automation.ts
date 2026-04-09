import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function dec(v: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(v);
}

function nextWorkOrderNo(orderNo: string) {
  return `WO-${orderNo}`;
}

function nextPoNo(orderNo: string, idx: number) {
  return `PO-${orderNo}-${String(idx + 1).padStart(2, '0')}`;
}

export async function runAutoPlanForSalesOrder(orderId: string, triggeredBy?: string) {
  return prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.findUnique({
      where: { id: orderId },
    });
    if (!so) throw new Error('SALES_ORDER_NOT_FOUND');

    const existingWo = await tx.workOrder.findFirst({ where: { salesOrderId: so.id } });
    if (existingWo) {
      await tx.mrpRun.create({
        data: { salesOrderId: so.id, triggeredBy: triggeredBy || null, status: 'SKIPPED', summary: 'Already planned' },
      });
      return { workOrders: 0, purchaseOrders: 0 };
    }

    const workOrder = await tx.workOrder.create({
      data: {
        workOrderNo: nextWorkOrderNo(so.orderNo),
        salesOrderId: so.id,
        skuItemCode: so.skuItemCode,
        batchNo: so.batchNo || `${so.orderNo}-B1`,
        plannedQty: so.orderedQty,
        status: 'PLANNED',
        planStartDate: new Date(),
        planEndDate: so.dueDate ?? null,
        createdBy: triggeredBy || 'system',
        notes: 'Auto-created by sales order MRP',
      },
    });

    const activeBom = await tx.bomHeader.findFirst({
      where: { parentItemCode: so.skuItemCode, isActive: true },
      include: { lines: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    let purchaseOrderCount = 0;
    if (activeBom) {
      let lineIndex = 0;
      for (const line of activeBom.lines) {
        const required = dec(line.quantity).mul(so.orderedQty);
        const balances = await tx.inventoryBalance.findMany({
          where: { itemCode: line.componentItemCode },
          select: { quantity: true },
        });
        const onHand = balances.reduce((sum, b) => sum.plus(b.quantity), dec(0));
        const shortage = required.minus(onHand);
        if (shortage.lte(0)) continue;

        const supplierCode = `AUTO-${line.componentItemCode}`;
        const supplier = await tx.supplier.upsert({
          where: { supplierCode },
          update: { name: `Auto Supplier ${line.componentItemCode}` },
          create: { supplierCode, name: `Auto Supplier ${line.componentItemCode}` },
        });
        await tx.purchaseOrder.create({
          data: {
            poNo: nextPoNo(so.orderNo, lineIndex),
            salesOrderId: so.id,
            supplierId: supplier.id,
            status: 'DRAFT',
            currency: so.currency,
            expectedDate: so.dueDate ?? null,
            createdBy: triggeredBy || 'system',
            lines: {
              create: {
                itemCode: line.componentItemCode,
                orderedQty: shortage,
                unitPrice: dec(0),
              },
            },
          },
        });
        purchaseOrderCount += 1;
        lineIndex += 1;
      }
    }

    await tx.mrpRun.create({
      data: {
        salesOrderId: so.id,
        triggeredBy: triggeredBy || null,
        status: 'DONE',
        summary: `WO:1 PO:${purchaseOrderCount}`,
      },
    });

    return { workOrders: 1, purchaseOrders: purchaseOrderCount, workOrderId: workOrder.id };
  });
}

export async function autoIssueMaterialsForWorkOrder(workOrderId: string, operator?: string) {
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');
    
    // Create WorkOrderOperation snapshot when released
    const routing = await tx.routingHeader.findFirst({
      where: { itemCode: wo.skuItemCode },
      include: { operations: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (routing && routing.operations.length > 0) {
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
          update: {} // do not overwrite if already exists
        });
      }
    }

    const bom = await tx.bomHeader.findFirst({
      where: { parentItemCode: wo.skuItemCode, isActive: true },
      include: { lines: true },
      orderBy: [{ updatedAt: 'desc' }],
    });
    if (!bom) return { issuedLines: 0 };

    let issuedLines = 0;
    for (const line of bom.lines) {
      const required = line.quantity.mul(wo.plannedQty);
      const balances = await tx.inventoryBalance.findMany({
        where: { itemCode: line.componentItemCode },
        orderBy: [{ updatedAt: 'asc' }],
      });
      let remaining = required;
      for (const bal of balances) {
        if (remaining.lte(0)) break;
        if (bal.quantity.lte(0)) continue;
        const issueQty = bal.quantity.gte(remaining) ? remaining : bal.quantity;
        await tx.inventoryBalance.update({
          where: { id: bal.id },
          data: { quantity: bal.quantity.minus(issueQty) },
        });
        const inventoryTxn = await tx.inventoryTxn.create({
          data: {
            txnType: 'OUT',
            itemCode: line.componentItemCode,
            quantity: issueQty,
            fromLocationId: bal.locationId,
            refType: 'WORK_ORDER',
            refNo: wo.workOrderNo,
            operator: operator || 'system',
            remarks: 'Auto issue by work-order release',
          },
        });
        await tx.workOrderMaterialTxn.create({
          data: {
            workOrderId: wo.id,
            inventoryTxnId: inventoryTxn.id,
            mode: 'ISSUE',
            itemCode: line.componentItemCode,
            locationId: bal.locationId,
            quantity: issueQty,
            operator: operator || 'system',
            remarks: 'Auto issue by system',
          },
        });
        remaining = remaining.minus(issueQty);
      }
      if (remaining.gt(0)) throw new Error('INSUFFICIENT_STOCK_FOR_ISSUE');
      issuedLines += 1;
    }
    return { issuedLines };
  });
}

export async function autoFinishWorkOrder(workOrderId: string, finishedQty: number, operator?: string) {
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');
    const inspectionNo = `FQC-${wo.workOrderNo}`;
    await tx.qualityInspection.upsert({
      where: { inspectionNo },
      create: {
        inspectionNo,
        stage: 'OQC',
        result: 'PASS',
        itemCode: wo.skuItemCode,
        batchNo: wo.batchNo,
        workOrderNo: wo.workOrderNo,
        sampleSize: finishedQty,
        defectQty: 0,
        issueSummary: null,
        disposition: 'Auto FQC pass',
        inspectedBy: operator || 'system',
        inspectedAt: new Date(),
      },
      update: {
        result: 'PASS',
        sampleSize: finishedQty,
        defectQty: 0,
        disposition: 'Auto FQC pass',
        inspectedAt: new Date(),
      },
    });

    const fgLocation = await tx.storageLocation.findFirst({ where: { isActive: true }, orderBy: [{ createdAt: 'asc' }] });
    if (!fgLocation) throw new Error('FG_LOCATION_NOT_FOUND');
    const bal = await tx.inventoryBalance.findUnique({
      where: { itemCode_locationId: { itemCode: wo.skuItemCode, locationId: fgLocation.id } },
    });
    const qty = dec(finishedQty);
    const current = bal?.quantity ?? dec(0);
    await tx.inventoryBalance.upsert({
      where: { itemCode_locationId: { itemCode: wo.skuItemCode, locationId: fgLocation.id } },
      create: { itemCode: wo.skuItemCode, locationId: fgLocation.id, quantity: current.plus(qty) },
      update: { quantity: current.plus(qty) },
    });
    await tx.inventoryTxn.create({
      data: {
        txnType: 'IN',
        itemCode: wo.skuItemCode,
        quantity: qty,
        toLocationId: fgLocation.id,
        refType: 'WORK_ORDER_FINISH',
        refNo: wo.workOrderNo,
        operator: operator || 'system',
      },
    });

    await tx.costEntry.createMany({
      data: [
        { workOrderId: wo.id, entryType: 'LABOR', amount: new Prisma.Decimal(finishedQty * 2), sourceType: 'AUTO_REPORT', sourceRef: wo.workOrderNo, createdBy: operator || 'system', currency: 'CNY' },
        { workOrderId: wo.id, entryType: 'OVERHEAD', amount: new Prisma.Decimal(finishedQty * 1.2), sourceType: 'AUTO_REPORT', sourceRef: wo.workOrderNo, createdBy: operator || 'system', currency: 'CNY' },
      ],
    });
  });
}
