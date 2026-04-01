import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');

    if (!itemCode) {
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
  } catch (error) {
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
          create: operations.map((op: { sequence: number, operationName: string, workstation: string, standardTimeSec: number }) => ({
            sequence: op.sequence,
            operationName: op.operationName,
            workstation: op.workstation,
            standardTimeSec: op.standardTimeSec,
          })),
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