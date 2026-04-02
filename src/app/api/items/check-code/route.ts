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

    const existingItem = await prisma.item.findUnique({
      where: { itemCode },
      select: { id: true },
    });

    return NextResponse.json({
      itemCode,
      available: !existingItem,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to validate item code.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
