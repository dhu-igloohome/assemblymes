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
    
    const [recentIssues, resolvedIssues] = await Promise.all([
      prisma.issueRecord.findMany({
        where: { reportedAt: { gte: sevenDaysAgo } },
        select: { reportedAt: true, status: true }
      }),
      prisma.issueRecord.findMany({
        where: { 
          reportedAt: { gte: sevenDaysAgo },
          NOT: { respondedAt: null }
        },
        select: { reportedAt: true, respondedAt: true, resolvedAt: true }
      })
    ]);

    // 4. Calculate MTTR (Mean Time to Respond) & MTTF (Mean Time to Fix)
    let totalResponseTime = 0;
    let responseCount = 0;
    let totalFixTime = 0;
    let fixCount = 0;

    resolvedIssues.forEach(issue => {
      if (issue.respondedAt) {
        totalResponseTime += (issue.respondedAt.getTime() - issue.reportedAt.getTime()) / 1000;
        responseCount++;
      }
      if (issue.resolvedAt) {
        totalFixTime += (issue.resolvedAt.getTime() - issue.reportedAt.getTime()) / 1000;
        fixCount++;
      }
    });

    const mttr = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
    const mttf = fixCount > 0 ? Math.round(totalFixTime / fixCount) : 0;

    // 5. Pareto Analysis (Type)
    const sortedIssues = [...issuesByType].sort((a, b) => b._count._all - a._count._all);
    const totalIssues = sortedIssues.reduce((sum, i) => sum + i._count._all, 0);
    let cumulative = 0;
    const paretoData = sortedIssues.map(i => {
      cumulative += i._count._all;
      return {
        type: i.issueType,
        count: i._count._all,
        percentage: totalIssues > 0 ? (i._count._all / totalIssues * 100).toFixed(1) : 0,
        cumulativePercentage: totalIssues > 0 ? (cumulative / totalIssues * 100).toFixed(1) : 0
      };
    });

    // 6. Quality yield from ProductionReports
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
      recentTrend: recentIssues.length,
      mttr,
      mttf,
      paretoData
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'ANALYTICS_LOAD_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
