import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeIssues, todayReports, itemsWithSafety, recentOrders, activeWOs] = await Promise.all([
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
      prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } })
    ]);

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
      recentOrders: formattedOrders
    });
  } catch (error: any) {
    return NextResponse.json({ error: true, msg: error.message }, { status: 500 });
  }
}
