import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      where: {
        safetyStock: { not: null },
      },
      select: {
        itemCode: true,
        itemName: true,
        safetyStock: true,
        inventoryBalances: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: [{ itemCode: 'asc' }],
      take: 500,
    });

    const rows = items
      .map((item) => {
        const onHand = item.inventoryBalances.reduce((sum, b) => sum + Number(b.quantity), 0);
        const safety = Number(item.safetyStock ?? 0);
        return {
          itemCode: item.itemCode,
          itemName: item.itemName,
          safetyStock: safety,
          onHand,
          shortage: Math.max(0, safety - onHand),
          warning: onHand < safety,
        };
      })
      .filter((row) => row.warning)
      .sort((a, b) => b.shortage - a.shortage);

    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'INVENTORY_WARNING_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
