import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseOptionalString, parsePositiveDecimal } from '@/lib/inventory';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const mode = parseOptionalString(body.mode).toUpperCase();
    const itemCode = parseOptionalString(body.itemCode);
    const locationId = parseOptionalString(body.locationId);
    const operator = parseOptionalString(body.operator);
    const remarks = parseOptionalString(body.remarks);
    const qty = parsePositiveDecimal(body.quantity);

    if (mode !== 'ISSUE' && mode !== 'RETURN') {
      return NextResponse.json({ error: 'MATERIAL_MODE_INVALID' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(itemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!locationId) {
      return NextResponse.json({ error: 'LOCATION_REQUIRED' }, { status: 400 });
    }
    if (!qty) {
      return NextResponse.json({ error: 'INVENTORY_QTY_INVALID' }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findUnique({ where: { id } });
    if (!workOrder) {
      return NextResponse.json({ error: 'WORK_ORDER_NOT_FOUND' }, { status: 404 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const bal = await tx.inventoryBalance.findUnique({
        where: {
          itemCode_locationId: {
            itemCode,
            locationId,
          },
        },
      });

      if (mode === 'ISSUE') {
        const current = bal?.quantity ?? new Prisma.Decimal(0);
        if (current.lessThan(qty)) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        await tx.inventoryBalance.upsert({
          where: {
            itemCode_locationId: { itemCode, locationId },
          },
          create: {
            itemCode,
            locationId,
            quantity: current.minus(qty),
          },
          update: {
            quantity: current.minus(qty),
          },
        });
      } else {
        const current = bal?.quantity ?? new Prisma.Decimal(0);
        await tx.inventoryBalance.upsert({
          where: {
            itemCode_locationId: { itemCode, locationId },
          },
          create: {
            itemCode,
            locationId,
            quantity: current.plus(qty),
          },
          update: {
            quantity: current.plus(qty),
          },
        });
      }

      return tx.inventoryTxn.create({
        data: {
          txnType: mode === 'ISSUE' ? 'OUT' : 'IN',
          itemCode,
          quantity: qty,
          fromLocationId: mode === 'ISSUE' ? locationId : null,
          toLocationId: mode === 'RETURN' ? locationId : null,
          refType: 'WORK_ORDER',
          refNo: workOrder.workOrderNo,
          operator: operator || null,
          remarks: remarks || null,
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'INSUFFICIENT_STOCK' }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: 'WORK_ORDER_MATERIAL_TXN_FAILED',
        details: message,
      },
      { status: 400 }
    );
  }
}
