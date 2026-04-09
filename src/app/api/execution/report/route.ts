import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

function dec(v: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(v);
}

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'PRODUCTION') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const workOrderOperationId = typeof body.workOrderOperationId === 'string' ? body.workOrderOperationId.trim() : '';
    const goodQty = typeof body.goodQty === 'number' ? body.goodQty : parseInt(String(body.goodQty ?? '0'), 10);
    const scrapQty = typeof body.scrapQty === 'number' ? body.scrapQty : parseInt(String(body.scrapQty ?? '0'), 10);
    const reworkQty = typeof body.reworkQty === 'number' ? body.reworkQty : parseInt(String(body.reworkQty ?? '0'), 10);
    const timeSpentSec = typeof body.timeSpentSec === 'number' ? body.timeSpentSec : parseInt(String(body.timeSpentSec ?? '0'), 10);
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';

    if (!workOrderOperationId) {
      return NextResponse.json({ error: 'OPERATION_ID_REQUIRED' }, { status: 400 });
    }

    if (goodQty < 0 || scrapQty < 0 || reworkQty < 0 || timeSpentSec < 0) {
      return NextResponse.json({ error: 'INVALID_NUMERIC_VALUES' }, { status: 400 });
    }

    const operator = session.employeeName || session.username;

    // 0. 技能校验 (Skill Check)
    if (session.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { skills: true }
      });
      
      if (employee) {
        const op = await prisma.workOrderOperation.findUnique({
          where: { id: workOrderOperationId },
          select: { operationName: true }
        });
        
        if (op) {
          const requiredSkill = op.operationName.includes('测试') ? 'TESTING' : 'ASSEMBLY';
          if (!employee.skills.includes(requiredSkill)) {
            return NextResponse.json({ error: 'SKILL_DENIED', requiredSkill }, { status: 403 });
          }
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取工序和工单信息
      const operation = await tx.workOrderOperation.findUnique({
        where: { id: workOrderOperationId },
        include: { workOrder: true },
      });

      if (!operation) {
        throw new Error('OPERATION_NOT_FOUND');
      }

      const wo = operation.workOrder;
      
      // 2. 创建报工记录 (ProductionReport)
      const report = await tx.productionReport.create({
        data: {
          workOrderOperationId,
          operator,
          goodQty,
          scrapQty,
          reworkQty,
          timeSpentSec,
          remarks: remarks || null,
        }
      });

      // 3. 更新工序状态和已完成数量
      const newCompletedQty = operation.completedQty + goodQty;
      const opStatus = newCompletedQty >= wo.plannedQty ? 'COMPLETED' : 'STARTED';
      
      await tx.workOrderOperation.update({
        where: { id: workOrderOperationId },
        data: {
          completedQty: newCompletedQty,
          status: opStatus,
          completedAt: opStatus === 'COMPLETED' ? new Date() : null,
          startedAt: operation.startedAt || new Date()
        }
      });

      // 4. 成本归集 (向内贡献成本)
      // 假设标准费率：人工 0.5/s, 制造费用 0.8/s
      if (timeSpentSec > 0) {
        const laborCost = timeSpentSec * 0.5; // Example labor rate
        const overheadCost = timeSpentSec * 0.8; // Example overhead rate

        await tx.costEntry.createMany({
          data: [
            {
              workOrderId: wo.id,
              entryType: 'LABOR',
              amount: dec(laborCost),
              currency: 'CNY',
              sourceType: 'PRODUCTION_REPORT',
              sourceRef: report.id,
              createdBy: operator,
              notes: `Auto-generated from report (Op: ${operation.sequence})`,
            },
            {
              workOrderId: wo.id,
              entryType: 'OVERHEAD',
              amount: dec(overheadCost),
              currency: 'CNY',
              sourceType: 'PRODUCTION_REPORT',
              sourceRef: report.id,
              createdBy: operator,
              notes: `Auto-generated from report (Op: ${operation.sequence})`,
            }
          ]
        });
      }

      // 5. 质量关联 (向外关联质量)
      // 如果当前工序是检验点，触发制程检验任务 (IPQC)
      if (operation.isInspectionPoint && (goodQty > 0 || scrapQty > 0 || reworkQty > 0)) {
        await tx.qualityInspection.create({
          data: {
            inspectionNo: `IPQC-${wo.workOrderNo}-${operation.sequence}-${Date.now().toString().slice(-4)}`,
            stage: 'IPQC',
            result: 'PENDING',
            itemCode: wo.skuItemCode,
            batchNo: wo.batchNo,
            workOrderNo: wo.workOrderNo,
            sampleSize: goodQty + scrapQty + reworkQty,
            defectQty: scrapQty + reworkQty,
            issueSummary: scrapQty > 0 || reworkQty > 0 ? `Reported scrap: ${scrapQty}, rework: ${reworkQty}` : null,
            disposition: 'Auto-created from production report',
            inspectedBy: 'system',
            inspectedAt: new Date(),
          }
        });
      }

      // 6. 库存驱动 (向下驱动库存)
      // a. 线边仓物料倒扣 (Backflush)
      // TODO: 完整的 Backflush 需要考虑按工序挂载 BOM。这里做简化：假设最后一道工序（或特定标志）报工时倒扣所有原材料。
      // 为保持演示闭环和简单性，我们已经在 WO Release 时执行了 `autoIssueMaterialsForWorkOrder`，因此原材料已经发出。
      // 在更复杂的系统中，可以在此处根据 goodQty 按比例扣减线边仓。

      // b. 成品自动入库 (如果是最后一道工序，并且满足完成数量)
      // 我们检查是否所有工序都已完成，如果这是最后一道工序并且它完成了
      const allOps = await tx.workOrderOperation.findMany({
        where: { workOrderId: wo.id },
        orderBy: { sequence: 'asc' }
      });
      
      const isLastOp = allOps.length > 0 && allOps[allOps.length - 1].id === workOrderOperationId;
      
      if (isLastOp && goodQty > 0) {
         // 我们将这部分 goodQty 视作成品，入库
         // 查找默认成品仓位 (假设 isActive 为真的第一个位置作为成品位置，或者特定仓位)
         const fgLocation = await tx.storageLocation.findFirst({ where: { isActive: true }, orderBy: [{ createdAt: 'asc' }] });
         if (fgLocation) {
             const qtyToReceive = dec(goodQty);
             
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
                 remarks: `Auto FG receive from last op report (Op: ${operation.sequence})`,
               },
             });

             // 触发 FQC
             const fqcNo = `FQC-${wo.workOrderNo}-${Date.now().toString().slice(-4)}`;
             await tx.qualityInspection.upsert({
                where: { inspectionNo: fqcNo },
                create: {
                  inspectionNo: fqcNo,
                  stage: 'OQC',
                  result: 'PASS',
                  itemCode: wo.skuItemCode,
                  batchNo: wo.batchNo,
                  workOrderNo: wo.workOrderNo,
                  sampleSize: goodQty,
                  defectQty: 0,
                  issueSummary: null,
                  disposition: 'Auto FQC pass based on FG receipt',
                  inspectedBy: 'system',
                  inspectedAt: new Date(),
                },
                update: {}
             });
         }
         
         // 如果全部计划数量已报工完毕，更新工单状态
         if (newCompletedQty >= wo.plannedQty) {
            await tx.workOrder.update({
               where: { id: wo.id },
               data: { status: 'DONE' }
            });
         } else {
            await tx.workOrder.update({
               where: { id: wo.id },
               data: { status: 'IN_PROGRESS' }
            });
         }
      } else {
         // 更新工单状态为 IN_PROGRESS
         if (wo.status === 'RELEASED' || wo.status === 'PLANNED') {
            await tx.workOrder.update({
               where: { id: wo.id },
               data: { status: 'IN_PROGRESS' }
            });
         }
      }

      return report;
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
