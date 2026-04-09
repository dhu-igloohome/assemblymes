import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 1. 获取未解决异常
    const activeIssuesCount = await prisma.issueRecord.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
    });

    // 2. 获取今日报工良品总数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reports = await prisma.productionReport.findMany({
      where: { createdAt: { gte: today } },
      select: { goodQty: true }
    });
    const todayGoodQty = reports.reduce((sum, r) => sum + r.goodQty, 0);

    // 3. 统计库存预警 (低于安全库存)
    const items = await prisma.item.findMany({
      where: { safetyStock: { gt: 0 } },
      select: { itemCode: true, safetyStock: true }
    });
    
    let lowStockCount = 0;
    for (const item of items) {
      const balance = await prisma.inventoryBalance.aggregate({
        where: { itemCode: item.itemCode },
        _sum: { quantity: true }
      });
      const currentQty = balance._sum.quantity?.toNumber() || 0;
      const safetyStock = typeof item.safetyStock === 'number' ? item.safetyStock : (item.safetyStock as any)?.toNumber() || 0;
      if (currentQty < safetyStock) {
        lowStockCount++;
      }
    }

    // 4. 最近 5 个确认的销售订单
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      where: { status: { not: 'DRAFT' } },
      orderBy: { confirmedAt: 'desc' },
      select: { orderNo: true, customerName: true, orderedQty: true, status: true, skuItemCode: true }
    });

    return NextResponse.json({
      activeIssuesCount,
      todayGoodQty,
      lowStockCount,
      recentOrders
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'DASHBOARD_LOAD_FAILED' }, { status: 500 });
  }
}
