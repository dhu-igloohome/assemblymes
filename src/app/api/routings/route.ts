import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');
    const mode = searchParams.get('mode');

    if (!itemCode) {
      if (mode === 'list') {
        const routings = await prisma.routingHeader.findMany({
          select: {
            id: true,
            itemCode: true,
            version: true,
            updatedAt: true,
            item: {
              select: {
                itemName: true,
              },
            },
            _count: {
              select: {
                operations: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        });

        return NextResponse.json(routings);
      }

      return NextResponse.json({ error: 'itemCode is required' }, { status: 400 });
    }

    const routing = await prisma.routingHeader.findFirst({
      where: { itemCode },
      include: {
        operations: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!routing) {
      return NextResponse.json({ message: 'No Routing found for this item' }, { status: 404 });
    }

    return NextResponse.json(routing);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Routing' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, version, operations } = body;

    const newRouting = await prisma.routingHeader.create({
      data: {
        itemCode,
        version,
        operations: {
          create: operations.map(
            (op: {
              sequence: number;
              operationName: string;
              workstation: string;
              standardTimeSec: number;
              isInspectionPoint?: boolean;
              inspectionStandard?: string | null;
            }) => ({
              sequence: op.sequence,
              operationName: op.operationName,
              workstation: op.workstation,
              standardTimeSec: op.standardTimeSec,
              isInspectionPoint: op.isInspectionPoint ?? false,
              inspectionStandard:
                typeof op.inspectionStandard === 'string' && op.inspectionStandard.trim() !== ''
                  ? op.inspectionStandard.trim()
                  : null,
            })
          ),
        },
      },
      include: { operations: true },
    });

    return NextResponse.json(newRouting, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to create Routing', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}