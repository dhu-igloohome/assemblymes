import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 1. Issue distribution by Type
    const issuesByType = await prisma.issueRecord.groupBy({
      by: ['issueType'],
      _count: { _all: true },
    });

    // 2. Issue distribution by WorkCenter
    const issuesByWorkCenter = await prisma.issueRecord.groupBy({
      by: ['workCenterCode'],
      _count: { _all: true },
      where: { NOT: { workCenterCode: null } }
    });

    // 3. Recent 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIssues = await prisma.issueRecord.findMany({
      where: { reportedAt: { gte: sevenDaysAgo } },
      select: { reportedAt: true, status: true }
    });

    // 4. Quality yield from ProductionReports
    const totalProduction = await prisma.productionReport.aggregate({
      _sum: { goodQty: true, scrapQty: true }
    });
    const totalGood = Number(totalProduction._sum.goodQty || 0);
    const totalScrap = Number(totalProduction._sum.scrapQty || 0);
    const yieldRate = totalGood + totalScrap > 0 
      ? (totalGood / (totalGood + totalScrap)) * 100 
      : 100;

    return NextResponse.json({
      issuesByType: issuesByType.map(i => ({ type: i.issueType, count: i._count._all })),
      issuesByWorkCenter: issuesByWorkCenter.map(i => ({ code: i.workCenterCode, count: i._count._all })),
      yieldRate: Number(yieldRate.toFixed(2)),
      totalGood,
      totalScrap,
      recentTrend: recentIssues.length
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'ANALYTICS_LOAD_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
