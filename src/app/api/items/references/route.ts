import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode')?.trim() ?? '';

    if (!/^\d{6}$/.test(itemCode)) {
      return NextResponse.json(
        { error: 'Item code must be exactly 6 digits.' },
        { status: 400 }
      );
    }

    const [bomParents, bomComponents, routings] = await Promise.all([
      prisma.bomHeader.findMany({
        where: { parentItemCode: itemCode },
        select: {
          id: true,
          version: true,
          isActive: true,
          parentItemCode: true,
          parentItem: {
            select: {
              itemName: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      prisma.bomLine.findMany({
        where: { componentItemCode: itemCode },
        select: {
          id: true,
          quantity: true,
          scrapRate: true,
          bomHeader: {
            select: {
              id: true,
              version: true,
              isActive: true,
              parentItemCode: true,
              parentItem: {
                select: {
                  itemName: true,
                },
              },
            },
          },
        },
        orderBy: [{ bomHeader: { updatedAt: 'desc' } }],
      }),
      prisma.routingHeader.findMany({
        where: { itemCode },
        select: {
          id: true,
          version: true,
          itemCode: true,
          item: {
            select: {
              itemName: true,
            },
          },
          operations: {
            select: {
              id: true,
              sequence: true,
              operationName: true,
              workstation: true,
              isInspectionPoint: true,
              inspectionStandard: true,
            },
            orderBy: { sequence: 'asc' },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      itemCode,
      bomParents,
      bomComponents,
      routings,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to fetch item references.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
