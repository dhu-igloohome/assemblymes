import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [workOrders, balances, items, workCenters, routingHeaders] = await Promise.all([
      prisma.workOrder.findMany({
        select: {
          id: true,
          workOrderNo: true,
          skuItemCode: true,
          plannedQty: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      prisma.inventoryBalance.findMany({
        select: { itemCode: true, quantity: true },
      }),
      prisma.item.findMany({
        select: { itemCode: true, safetyStock: true },
      }),
      prisma.workCenter.findMany({
        select: { workCenterCode: true, name: true, dailyCapacity: true },
      }),
      prisma.routingHeader.findMany({
        select: {
          itemCode: true,
          operations: {
            select: {
              workstation: true,
              standardTimeSec: true,
            },
          },
        },
      }),
    ]);

    const availableByItem = new Map<string, number>();
    for (const row of balances) {
      const current = availableByItem.get(row.itemCode) ?? 0;
      availableByItem.set(row.itemCode, current + Number(row.quantity));
    }

    const safetyByItem = new Map<string, number>();
    for (const item of items) {
      safetyByItem.set(item.itemCode, Number(item.safetyStock ?? 0));
    }

    const shortage = workOrders
      .map((wo) => {
        const available = availableByItem.get(wo.skuItemCode) ?? 0;
        const required = wo.plannedQty;
        const gap = Math.max(0, required - available);
        return {
          workOrderNo: wo.workOrderNo,
          skuItemCode: wo.skuItemCode,
          plannedQty: wo.plannedQty,
          availableQty: available,
          shortageQty: gap,
          status: wo.status,
        };
      })
      .filter((row) => row.shortageQty > 0)
      .slice(0, 100);

    const safetyWarnings = Array.from(availableByItem.entries())
      .map(([itemCode, qty]) => {
        const safety = safetyByItem.get(itemCode) ?? 0;
        return {
          itemCode,
          availableQty: qty,
          safetyStock: safety,
          gapQty: Math.max(0, safety - qty),
        };
      })
      .filter((row) => row.availableQty < row.safetyStock)
      .sort((a, b) => b.gapQty - a.gapQty)
      .slice(0, 100);

    const routeByItem = new Map(
      routingHeaders.map((r) => [
        r.itemCode,
        r.operations.map((op) => ({ workstation: op.workstation, standardTimeSec: op.standardTimeSec })),
      ])
    );

    const loadByWorkstation = new Map<string, number>();
    for (const wo of workOrders) {
      const operations = routeByItem.get(wo.skuItemCode) ?? [];
      for (const op of operations) {
        const sec = (loadByWorkstation.get(op.workstation) ?? 0) + wo.plannedQty * op.standardTimeSec;
        loadByWorkstation.set(op.workstation, sec);
      }
    }

    const capacity = workCenters.map((wc) => {
      const key = wc.workCenterCode || wc.name;
      const loadSec = loadByWorkstation.get(key) ?? loadByWorkstation.get(wc.name) ?? 0;
      const daySec = (wc.dailyCapacity ?? 0) * 3600;
      const utilization = daySec > 0 ? (loadSec / daySec) * 100 : 0;
      return {
        workCenterCode: wc.workCenterCode,
        name: wc.name,
        dailyCapacityHours: wc.dailyCapacity ?? 0,
        plannedLoadHours: Number((loadSec / 3600).toFixed(2)),
        utilizationPct: Number(utilization.toFixed(1)),
      };
    });

    const payload = {
      summary: {
        workOrderCount: workOrders.length,
        shortageCount: shortage.length,
        safetyWarningCount: safetyWarnings.length,
        overloadedCenterCount: capacity.filter((v) => v.utilizationPct > 100).length,
      },
      shortage,
      safetyWarnings,
      capacity,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'PLANNING_OVERVIEW_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
