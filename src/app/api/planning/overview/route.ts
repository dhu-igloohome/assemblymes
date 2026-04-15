import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [workOrders, balances, items, workCenters, routingHeaders, bomHeaders] = await Promise.all([
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
        select: { itemCode: true, itemName: true, safetyStock: true },
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
      prisma.bomHeader.findMany({
        where: { isActive: true },
        include: { lines: true },
      }),
    ]);

    const availableByItem = new Map<string, number>();
    for (const row of balances) {
      const current = availableByItem.get(row.itemCode) ?? 0;
      availableByItem.set(row.itemCode, current + Number(row.quantity));
    }

    const bomMap = new Map(bomHeaders.map(b => [b.parentItemCode, b.lines]));
    const itemNames = new Map(items.map(i => [i.itemCode, i.itemName]));

    // Advanced MRP: Check component shortage for each Work Order
    const woShortages = workOrders
      .filter(wo => wo.status === 'PLANNED' || wo.status === 'RELEASED')
      .map(wo => {
        const lines = bomMap.get(wo.skuItemCode) || [];
        const componentGaps = lines.map(line => {
          const required = Number(line.quantity) * wo.plannedQty;
          const available = availableByItem.get(line.componentItemCode) ?? 0;
          return {
            componentCode: line.componentItemCode,
            componentName: itemNames.get(line.componentItemCode) || 'Unknown',
            required,
            available,
            gap: Math.max(0, required - available)
          };
        }).filter(g => g.gap > 0);

        return {
          workOrderNo: wo.workOrderNo,
          skuItemCode: wo.skuItemCode,
          skuName: itemNames.get(wo.skuItemCode) || 'Unknown',
          plannedQty: wo.plannedQty,
          status: wo.status,
          componentGaps,
          isReady: componentGaps.length === 0
        };
      });

    const shortage = woShortages.filter(s => !s.isReady);

    const safetyByItem = new Map<string, number>();
    for (const item of items) {
      safetyByItem.set(item.itemCode, Number(item.safetyStock ?? 0));
    }

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
