import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentItemCode = searchParams.get('parentItemCode');

    if (!parentItemCode) {
      return NextResponse.json({ error: 'parentItemCode is required' }, { status: 400 });
    }

    const bomHeader = await prisma.bomHeader.findFirst({
      where: { parentItemCode, isActive: true },
      include: {
        lines: {
          include: {
            componentItem: true,
          },
        },
        parentItem: true,
      },
    });

    if (!bomHeader) {
      return NextResponse.json({ message: 'No BOM found for this item' }, { status: 404 });
    }

    return NextResponse.json(bomHeader);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentItemCode, version, lines } = body;

    // In a real application, you might want to deactivate old BOM versions here
    const newBom = await prisma.bomHeader.create({
      data: {
        parentItemCode,
        version,
        isActive: true,
        lines: {
          create: lines.map((line: { componentItemCode: string, quantity: number, scrapRate?: number }) => ({
            componentItemCode: line.componentItemCode,
            quantity: line.quantity,
            scrapRate: line.scrapRate || 0,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(newBom, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to create BOM', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}