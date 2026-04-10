import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 获取 24H 起始时间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 2. 使用稳健的 findMany 结合 reduce，避免 aggregate 类型冲突
    const [issuesCount, todayReports, allItems, allBalances] = await Promise.all([
      // 活跃异常
      prisma.issueRecord.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      }),
      // 今日产出
      prisma.productionReport.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { goodQty: true }
      }),
      // 安全库存项
      prisma.item.findMany({
        where: { safetyStock: { gt: 0 } },
        select: { itemCode: true, safetyStock: true }
      }),
      // 库存余额
      prisma.inventoryBalance.findMany({
        select: { itemCode: true, quantity: true }
      })
    ]);

    // 计算今日产出总和
    const todayGoodQty = todayReports.reduce((sum, r) => sum + (r.goodQty || 0), 0);

    // 计算库存预警
    let lowStockCount = 0;
    for (const item of allItems) {
      const currentQty = allBalances
        .filter(b => b.itemCode === item.itemCode)
        .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
      if (currentQty < Number(item.safetyStock)) {
        lowStockCount++;
      }
    }

    // 3. 最近订单
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { orderNo: true, customerName: true, orderedQty: true, status: true, skuItemCode: true }
    });

    return NextResponse.json({
      activeIssuesCount: issuesCount,
      todayGoodQty,
      lowStockCount,
      recentOrders
    });
  } catch (error: any) {
    console.error('FINAL_SYNC_ERROR:', error.message);
    return NextResponse.json({ error: true, msg: error.message }, { status: 500 });
  }
}
