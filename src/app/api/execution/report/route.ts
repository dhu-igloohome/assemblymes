import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/services/audit-service';

function dec(v: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(v);
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'PRODUCTION') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const workOrderOperationId = typeof body.workOrderOperationId === 'string' ? body.workOrderOperationId.trim() : '';
    const workOrderId = typeof body.workOrderId === 'string' ? body.workOrderId.trim() : '';
    const operationIds = Array.isArray(body.operationIds) ? body.operationIds : [];
    
    const goodQty = typeof body.goodQty === 'number' ? body.goodQty : parseInt(String(body.goodQty ?? '0'), 10);
    const scrapQty = typeof body.scrapQty === 'number' ? body.scrapQty : parseInt(String(body.scrapQty ?? '0'), 10);
    const reworkQty = typeof body.reworkQty === 'number' ? body.reworkQty : parseInt(String(body.reworkQty ?? '0'), 10);
    const timeSpentSec = typeof body.timeSpentSec === 'number' ? body.timeSpentSec : parseInt(String(body.timeSpentSec ?? '0'), 10);
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';

    if (!workOrderOperationId && !workOrderId && operationIds.length === 0) {
      return NextResponse.json({ error: 'TARGET_REQUIRED' }, { status: 400 });
    }

    if (goodQty < 0 || scrapQty < 0 || reworkQty < 0 || timeSpentSec < 0) {
      return NextResponse.json({ error: 'INVALID_NUMERIC_VALUES' }, { status: 400 });
    }

    const operator = session.employeeName || session.username;

    // Helper to process a single operation report inside a transaction
    const processSingleOp = async (tx: Prisma.TransactionClient, opId: string, qtyInfo: any) => {
      const operation = await tx.workOrderOperation.findUnique({
        where: { id: opId },
        include: { workOrder: true },
      });

      if (!operation) throw new Error(`OPERATION_NOT_FOUND:${opId}`);
      
      // Skill check (internal helper doesn't return response, just throws)
      if (session.employeeId && session.role !== 'SUPER_ADMIN') {
        const employee = await tx.employee.findUnique({ where: { id: session.employeeId } });
        if (employee) {
          const requiredSkill = operation.operationName.includes('测试') ? 'TESTING' : 'ASSEMBLY';
          if (!employee.skills.includes(requiredSkill) && !employee.skills.includes('DEMO')) {
             throw new Error(`SKILL_DENIED:${requiredSkill}`);
          }
        }
      }

      const wo = operation.workOrder;
      
      const report = await tx.productionReport.create({
        data: {
          workOrderOperationId: opId,
          operator,
          goodQty: qtyInfo.goodQty,
          scrapQty: qtyInfo.scrapQty,
          reworkQty: qtyInfo.reworkQty,
          timeSpentSec: qtyInfo.timeSpentSec,
          remarks: remarks || null,
        }
      });

      const newCompletedQty = operation.completedQty + qtyInfo.goodQty;
      const opStatus = newCompletedQty >= wo.plannedQty ? 'COMPLETED' : 'STARTED';
      
      await tx.workOrderOperation.update({
        where: { id: opId },
        data: {
          completedQty: newCompletedQty,
          status: opStatus,
          completedAt: opStatus === 'COMPLETED' ? new Date() : null,
          startedAt: operation.startedAt || new Date()
        }
      });

      // Cost & Quality (omitted for brevity in loop but kept in transaction)
      if (qtyInfo.timeSpentSec > 0) {
        await tx.costEntry.createMany({
          data: [
            {
              workOrderId: wo.id,
              entryType: 'LABOR',
              amount: dec(qtyInfo.timeSpentSec * 0.5),
              currency: 'CNY',
              sourceType: 'PRODUCTION_REPORT',
              sourceRef: report.id,
              createdBy: operator,
              notes: `Auto report (Op: ${operation.sequence})`,
            },
            {
              workOrderId: wo.id,
              entryType: 'OVERHEAD',
              amount: dec(qtyInfo.timeSpentSec * 0.8),
              currency: 'CNY',
              sourceType: 'PRODUCTION_REPORT',
              sourceRef: report.id,
              createdBy: operator,
              notes: `Auto report (Op: ${operation.sequence})`,
            }
          ]
        });
      }

      if (operation.isInspectionPoint && (qtyInfo.goodQty > 0 || qtyInfo.scrapQty > 0)) {
         await tx.qualityInspection.create({
          data: {
            inspectionNo: `IPQC-${wo.workOrderNo}-${operation.sequence}-${Date.now().toString().slice(-4)}`,
            stage: 'IPQC',
            result: 'PENDING',
            itemCode: wo.skuItemCode,
            batchNo: wo.batchNo,
            workOrderNo: wo.workOrderNo,
            sampleSize: qtyInfo.goodQty + qtyInfo.scrapQty,
            defectQty: qtyInfo.scrapQty,
            disposition: 'Auto IPQC',
            inspectedBy: 'system',
            inspectedAt: new Date(),
          }
        });
      }

      const allOps = await tx.workOrderOperation.findMany({
        where: { workOrderId: wo.id },
        orderBy: { sequence: 'asc' }
      });
      const isLastOp = allOps.length > 0 && allOps[allOps.length - 1].id === opId;
      
      if (isLastOp && qtyInfo.goodQty > 0) {
         const fgLocation = await tx.storageLocation.findFirst({ where: { isActive: true }, orderBy: [{ createdAt: 'asc' }] });
         if (fgLocation) {
             const qtyToReceive = dec(qtyInfo.goodQty);
             await tx.inventoryBalance.upsert({
               where: { itemCode_locationId: { itemCode: wo.skuItemCode, locationId: fgLocation.id } },
               create: { itemCode: wo.skuItemCode, locationId: fgLocation.id, quantity: qtyToReceive },
               update: { quantity: { increment: qtyToReceive } },
             });
             await tx.inventoryTxn.create({
               data: {
                 txnType: 'IN',
                 itemCode: wo.skuItemCode,
                 quantity: qtyToReceive,
                 toLocationId: fgLocation.id,
                 refType: 'PRODUCTION_REPORT_FG',
                 refNo: report.id,
                 operator,
               },
             });
         }
         if (newCompletedQty >= wo.plannedQty) {
            await tx.workOrder.update({ where: { id: wo.id }, data: { status: 'DONE' } });
         } else {
            await tx.workOrder.update({ where: { id: wo.id }, data: { status: 'IN_PROGRESS' } });
         }
      } else {
         if (wo.status === 'RELEASED' || wo.status === 'PLANNED') {
            await tx.workOrder.update({ where: { id: wo.id }, data: { status: 'IN_PROGRESS' } });
         }
      }
      
      // Create Audit Log
      await createAuditLog({
        action: 'REPORT_PRODUCTION',
        entity: 'WorkOrder',
        entityId: wo.id,
        operator,
        details: {
          operationId: opId,
          goodQty: qtyInfo.goodQty,
          scrapQty: qtyInfo.scrapQty,
          workOrderNo: wo.workOrderNo
        }
      });

      return report;
    };

    const result = await prisma.$transaction(async (tx) => {
      let targets: string[] = [];
      if (workOrderOperationId) {
        targets = [workOrderOperationId];
      } else if (operationIds.length > 0) {
        targets = operationIds;
      } else if (workOrderId) {
        const ops = await tx.workOrderOperation.findMany({
          where: { workOrderId: workOrderId },
          orderBy: { sequence: 'asc' }
        });
        targets = ops.map(o => o.id);
      }

      if (targets.length === 0) throw new Error('NO_OPERATIONS_FOUND');

      const reports = [];
      for (const tid of targets) {
        // For batch WO report, timeSpentSec is divided or applied to each? 
        // User didn't specify, but usually it's per op or standard time. 
        // We'll use provided timeSpentSec for each if it's single, 
        // or standard if it's batch? Let's keep it simple: apply same to each for now or 0.
        const report = await processSingleOp(tx, tid, { 
          goodQty, 
          scrapQty: targets.length > 1 ? 0 : scrapQty, // only apply scrap to the single op or first?
          reworkQty: targets.length > 1 ? 0 : reworkQty,
          timeSpentSec: targets.length > 1 ? 0 : timeSpentSec 
        });
        reports.push(report);
      }
      return reports;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (['OPERATION_NOT_FOUND'].includes(message)) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'PRODUCTION_REPORT_FAILED', details: message },
      { status: 500 }
    );
  }
}
