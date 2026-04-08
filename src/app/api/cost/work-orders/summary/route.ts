import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workOrders = await prisma.workOrder.findMany({
      select: {
        id: true,
        workOrderNo: true,
        skuItemCode: true,
        batchNo: true,
        plannedQty: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const sums = await prisma.costEntry.groupBy({
      by: ['workOrderId', 'entryType'],
      where: {
        workOrderId: { not: null },
      },
      _sum: {
        amount: true,
      },
    });

    const sumMap = new Map<string, { material: number; labor: number; overhead: number; adjustment: number }>();

    for (const row of sums) {
      if (!row.workOrderId) continue;
      const existing = sumMap.get(row.workOrderId) ?? {
        material: 0,
        labor: 0,
        overhead: 0,
        adjustment: 0,
      };
      const amount = Number(row._sum.amount ?? 0);
      if (row.entryType === 'MATERIAL') existing.material += amount;
      if (row.entryType === 'LABOR') existing.labor += amount;
      if (row.entryType === 'OVERHEAD') existing.overhead += amount;
      if (row.entryType === 'ADJUSTMENT') existing.adjustment += amount;
      sumMap.set(row.workOrderId, existing);
    }

    const payload = workOrders.map((wo) => {
      const parts = sumMap.get(wo.id) ?? { material: 0, labor: 0, overhead: 0, adjustment: 0 };
      const total = parts.material + parts.labor + parts.overhead + parts.adjustment;
      return {
        workOrderNo: wo.workOrderNo,
        skuItemCode: wo.skuItemCode,
        batchNo: wo.batchNo,
        plannedQty: wo.plannedQty,
        status: wo.status,
        materialCost: parts.material,
        laborCost: parts.labor,
        overheadCost: parts.overhead,
        adjustmentCost: parts.adjustment,
        totalCost: total,
        unitCost: wo.plannedQty > 0 ? total / wo.plannedQty : 0,
      };
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'COST_SUMMARY_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
