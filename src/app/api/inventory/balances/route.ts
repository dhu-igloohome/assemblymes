import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode')?.trim() || '';
    const warehouseCode = searchParams.get('warehouseCode')?.trim().toUpperCase() || '';

    const rows = await prisma.inventoryBalance.findMany({
      where: {
        ...(itemCode ? { itemCode } : {}),
        ...(warehouseCode
          ? {
              location: {
                warehouse: { warehouseCode },
              },
            }
          : {}),
      },
      include: {
        location: {
          include: {
            warehouse: true,
          },
        },
        item: {
          select: { itemCode: true, itemName: true, itemType: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
    });

    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'INVENTORY_BALANCE_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
