import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeIssues, todayReports, itemsWithSafety, recentOrders, activeWOs, materialDemandWOs, allBalances] = await Promise.all([
      // 1. 活跃异常明细
      prisma.issueRecord.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { reportedAt: 'desc' },
        take: 3
      }),
      // 2. 今日产出
      prisma.productionReport.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { goodQty: true }
      }),
      // 3. 库存预警数
      prisma.item.count({ where: { safetyStock: { gt: 0 } } }),
      // 4. 最近订单及其工单进度
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { workOrders: { select: { status: true, plannedQty: true } } }
      }),
      // 5. 正在进行的工单 (判断产线是否忙碌)
      prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      // 6. 获取未完成工单用于物料缺口计算
      prisma.workOrder.findMany({
        where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } },
        select: { skuItemCode: true, plannedQty: true }
      }),
      // 7. 获取全库位余额
      prisma.inventoryBalance.findMany({
        select: { itemCode: true, quantity: true }
      })
    ]);

    // 逻辑：计算 3 天内物料缺口 (简化版：计算当前所有未完成工单的总需求)
    const demandMap = new Map<string, number>();
    const skuCodes = Array.from(new Set(materialDemandWOs.map(wo => wo.skuItemCode)));
    
    // 获取这些 SKU 的活跃 BOM
    const boms = await prisma.bomHeader.findMany({
      where: { parentItemCode: { in: skuCodes }, isActive: true },
      include: { 
        lines: { select: { componentItemCode: true, quantity: true } },
        parentItem: { select: { itemName: true } }
      }
    });

    // 累加需求
    for (const wo of materialDemandWOs) {
      const bom = boms.find(b => b.parentItemCode === wo.skuItemCode);
      if (bom) {
        for (const line of bom.lines) {
          const totalReq = Number(line.quantity) * wo.plannedQty;
          demandMap.set(line.componentItemCode, (demandMap.get(line.componentItemCode) || 0) + totalReq);
        }
      }
    }

    // 计算库存余量并找出缺口
    const materialGaps: any[] = [];
    const inventoryMap = new Map<string, number>();
    allBalances.forEach(b => {
      inventoryMap.set(b.itemCode, (inventoryMap.get(b.itemCode) || 0) + Number(b.quantity));
    });

    // 只展示缺口最大的前 5 个
    for (const [itemCode, demand] of demandMap.entries()) {
      const currentInv = inventoryMap.get(itemCode) || 0;
      if (currentInv < demand) {
        materialGaps.push({
          itemCode,
          demand,
          inventory: currentInv,
          gap: demand - currentInv,
          shortageRate: ((demand - currentInv) / demand * 100).toFixed(1)
        });
      }
    }
    materialGaps.sort((a, b) => b.gap - a.gap);

    // 获取缺料物料的名称
    const gapItemCodes = materialGaps.slice(0, 5).map(g => g.itemCode);
    const gapItems = await prisma.item.findMany({
      where: { itemCode: { in: gapItemCodes } },
      select: { itemCode: true, itemName: true }
    });
    
    const finalMaterialGaps = materialGaps.slice(0, 5).map(g => ({
      ...g,
      itemName: gapItems.find(i => i.itemCode === g.itemCode)?.itemName || '未知物料'
    }));

    // 计算今日产出
    const todayGoodQty = todayReports.reduce((sum, r) => sum + (r.goodQty || 0), 0);

    // 格式化订单进度
    const formattedOrders = recentOrders.map(so => {
      const hasWO = so.workOrders.length > 0;
      const isDone = so.workOrders.every(wo => wo.status === 'DONE') && hasWO;
      const isInProgress = so.workOrders.some(wo => wo.status === 'IN_PROGRESS' || wo.status === 'RELEASED');
      
      let stage = 'WAIT_PLAN'; // 待排产
      if (so.status === 'CLOSED') stage = 'DELIVERED';
      else if (isDone) stage = 'WAIT_SHIP';
      else if (isInProgress) stage = 'PRODUCING';

      return {
        ...so,
        stage,
        progress: isDone ? 100 : (isInProgress ? 50 : 10)
      };
    });

    return NextResponse.json({
      activeIssuesCount: activeIssues.length,
      activeIssuesList: activeIssues,
      todayGoodQty,
      inventoryAlertsCount: itemsWithSafety,
      lineStatus: activeWOs > 0 ? 'RUNNING' : 'IDLE',
      recentOrders: formattedOrders,
      materialGaps: finalMaterialGaps
    });
  } catch (error: any) {
    return NextResponse.json({ error: true, msg: error.message }, { status: 500 });
  }
}
