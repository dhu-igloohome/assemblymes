import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. 活跃异常 - 不限状态，直接查总数
    const activeIssuesCount = await prisma.issueRecord.count();

    // 2. 总产出 - 不限时间
    const reports = await prisma.productionReport.aggregate({
      _sum: { goodQty: true }
    });
    const todayGoodQty = Number(reports._sum.goodQty || 0);

    // 3. 库存预警 - 统计所有安全库存 > 0 的项
    const lowStockCount = await prisma.item.count({
      where: { safetyStock: { gt: 0 } }
    });

    // 4. 所有订单
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { orderNo: true, customerName: true, orderedQty: true, status: true, skuItemCode: true }
    });

    return NextResponse.json({
      activeIssuesCount,
      todayGoodQty,
      lowStockCount,
      recentOrders,
      debug: {
        env: 'PRODUCTION_FORCE',
        time: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'DB_FETCH_ERROR', message: error.message }, { status: 500 });
  }
}
