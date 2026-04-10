import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 活跃异常 - 恢复状态过滤 (OPEN, IN_PROGRESS)
    const activeIssuesCount = await prisma.issueRecord.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
    });

    // 2. 今日产出 - 恢复 24H 时间过滤
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const reports = await prisma.productionReport.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { goodQty: true }
    });
    const todayGoodQty = Number(reports._sum?.goodQty || 0);

    // 3. 库存预警 - 统计当前低于安全库存的项目
    const itemsWithSafety = await prisma.item.findMany({
      where: { safetyStock: { gt: 0 } },
      select: { itemCode: true, safetyStock: true }
    });
    const balances = await prisma.inventoryBalance.groupBy({
      by: ['itemCode'],
      where: { itemCode: { in: itemsWithSafety.map(i => i.itemCode) } },
      _sum: { quantity: true }
    });
    const balanceMap = new Map(balances.map(b => [b.itemCode, Number(b._sum.quantity || 0)]));
    let lowStockCount = 0;
    for (const item of itemsWithSafety) {
      if ((balanceMap.get(item.itemCode) || 0) < Number(item.safetyStock)) lowStockCount++;
    }

    // 4. 最近订单 - 保持最新 5 笔
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { orderNo: true, customerName: true, orderedQty: true, status: true, skuItemCode: true }
    });

    return NextResponse.json({
      activeIssuesCount,
      todayGoodQty,
      lowStockCount,
      recentOrders
    });
  } catch (e: any) {
    console.error('Dashboard Sync Error:', e.message);
    return NextResponse.json({ error: true, msg: e.message }, { status: 500 });
  }
}
