import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { reportType } = await request.json();

    // 1. Fetch real aggregate data for AI context
    const [totalPlanned, issueCount, materialCount] = await Promise.all([
      prisma.workOrder.aggregate({ _sum: { plannedQty: true } }),
      prisma.issueRecord.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.item.count()
    ]);

    const planned = totalPlanned?._sum?.plannedQty || 0;

    // 2. Simulated Industrial Insight Logic
    const insights: Record<string, { summary: string; actions: string[]; trend: 'UP' | 'DOWN' | 'STABLE' }> = {
      'PRODUCTION': {
        summary: `Production planning reached ${planned} units. Capacity utilization is at 82%, but Station A-1 shows a 15% efficiency drop due to tool wear.`,
        actions: [
          'Prioritize Station A-1 maintenance.',
          'Reallocate 2 operators to Line B to balance load.'
        ],
        trend: 'UP'
      },
      'QUALITY': {
        summary: `First Pass Yield (FPY) is holding at 98.4%. ${issueCount} active anomalies detected, mainly in electrical testing phase.`,
        actions: [
          'Audit electrical test jig J-50.',
          'Increase sampling rate for high-risk component C-901.'
        ],
        trend: 'STABLE'
      },
      'COST': {
        summary: `Unit cost variance identified. Raw material expenses increased by 4.2% this quarter, impacting gross margin.`,
        actions: [
          'Consolidate supplier orders to reduce logistics cost.',
          'Review scrap rates on Assembly Line 2.'
        ],
        trend: 'DOWN'
      }
    };

    const result = insights[reportType] || insights['PRODUCTION'];
    
    // Simulate AI thinking
    await new Promise(res => setTimeout(res, 1800));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'INSIGHT_GEN_FAILED' }, { status: 500 });
  }
}
