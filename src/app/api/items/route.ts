import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');
    const itemType = searchParams.get('itemType');

    const where: Record<string, unknown> = {};
    if (itemCode) where.itemCode = { contains: itemCode };
    if (itemType) where.itemType = itemType;

    const items = await prisma.item.findMany({
      where,
      orderBy: { itemCode: 'asc' },
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, itemName, itemType, unit, description } = body;

    // TODO: In a real system, you might want to auto-generate the 6-digit itemCode
    // if it's not provided, but for now we expect it to be passed and unique.

    const newItem = await prisma.item.create({
      data: {
        itemCode,
        itemName,
        itemType,
        unit,
        description,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to create item', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}