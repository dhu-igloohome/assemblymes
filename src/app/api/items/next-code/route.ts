import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ITEM_TYPE_PREFIX, buildNextItemCode, isItemType } from '@/lib/item-master';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('itemType');

    if (!itemType || !isItemType(itemType)) {
      return NextResponse.json(
        { error: 'A valid itemType is required.' },
        { status: 400 }
      );
    }

    const prefix = ITEM_TYPE_PREFIX[itemType];
    const latestItem = await prisma.item.findFirst({
      where: {
        itemCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        itemCode: 'desc',
      },
      select: {
        itemCode: true,
      },
    });

    return NextResponse.json({
      itemType,
      nextCode: buildNextItemCode(prefix, latestItem?.itemCode),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to generate next item code.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
