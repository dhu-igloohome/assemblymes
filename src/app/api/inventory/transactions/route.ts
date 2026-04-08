import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isInventoryTxnType, parseOptionalString, parsePositiveDecimal } from '@/lib/inventory';

function add(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.plus(b);
}

function sub(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.minus(b);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchNo = parseOptionalString(searchParams.get('batchNo'));
    const rows = await prisma.inventoryTxn.findMany({
      where: {
        ...(batchNo ? { batchNo } : {}),
      },
      include: {
        item: { select: { itemCode: true, itemName: true } },
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'INVENTORY_TXN_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const txnType = parseOptionalString(body.txnType);
    const itemCode = parseOptionalString(body.itemCode);
    const fromLocationId = parseOptionalString(body.fromLocationId);
    const toLocationId = parseOptionalString(body.toLocationId);
    const refType = parseOptionalString(body.refType);
    const refNo = parseOptionalString(body.refNo);
    const operator = parseOptionalString(body.operator);
    const remarks = parseOptionalString(body.remarks);
    const batchNo = parseOptionalString(body.batchNo);
    const qty = parsePositiveDecimal(body.quantity);

    if (!isInventoryTxnType(txnType)) {
      return NextResponse.json({ error: 'INVENTORY_TXN_TYPE_INVALID' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(itemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!qty) {
      return NextResponse.json({ error: 'INVENTORY_QTY_INVALID' }, { status: 400 });
    }
    if ((txnType === 'OUT' || txnType === 'TRANSFER') && !fromLocationId) {
      return NextResponse.json({ error: 'FROM_LOCATION_REQUIRED' }, { status: 400 });
    }
    if ((txnType === 'IN' || txnType === 'TRANSFER') && !toLocationId) {
      return NextResponse.json({ error: 'TO_LOCATION_REQUIRED' }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { itemCode }, select: { itemCode: true } });
    if (!item) {
      return NextResponse.json({ error: 'SKU_NOT_FOUND' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loadBalance = async (locationId: string) => {
        const existing = await tx.inventoryBalance.findUnique({
          where: {
            itemCode_locationId: { itemCode, locationId },
          },
        });
        if (existing) {
          return existing;
        }
        return tx.inventoryBalance.create({
          data: {
            itemCode,
            locationId,
            quantity: new Prisma.Decimal(0),
          },
        });
      };

      if (txnType === 'IN' && toLocationId) {
        const to = await loadBalance(toLocationId);
        await tx.inventoryBalance.update({
          where: { id: to.id },
          data: { quantity: add(to.quantity, qty) },
        });
      }

      if (txnType === 'OUT' && fromLocationId) {
        const from = await loadBalance(fromLocationId);
        if (from.quantity.lessThan(qty)) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        await tx.inventoryBalance.update({
          where: { id: from.id },
          data: { quantity: sub(from.quantity, qty) },
        });
      }

      if (txnType === 'TRANSFER' && fromLocationId && toLocationId) {
        if (fromLocationId === toLocationId) {
          throw new Error('TRANSFER_LOCATION_SAME');
        }
        const from = await loadBalance(fromLocationId);
        if (from.quantity.lessThan(qty)) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        const to = await loadBalance(toLocationId);
        await tx.inventoryBalance.update({
          where: { id: from.id },
          data: { quantity: sub(from.quantity, qty) },
        });
        await tx.inventoryBalance.update({
          where: { id: to.id },
          data: { quantity: add(to.quantity, qty) },
        });
      }

      if (txnType === 'ADJUST') {
        if (!toLocationId) {
          throw new Error('TO_LOCATION_REQUIRED');
        }
        const to = await loadBalance(toLocationId);
        await tx.inventoryBalance.update({
          where: { id: to.id },
          data: { quantity: add(to.quantity, qty) },
        });
      }

      const created = await tx.inventoryTxn.create({
        data: {
          txnType,
          itemCode,
          quantity: qty,
          batchNo: batchNo || null,
          fromLocationId: fromLocationId || null,
          toLocationId: toLocationId || null,
          refType: refType || null,
          refNo: refNo || null,
          operator: operator || null,
          remarks: remarks || null,
        },
      });
      return created;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'INSUFFICIENT_STOCK' }, { status: 400 });
    }
    if (message === 'TRANSFER_LOCATION_SAME') {
      return NextResponse.json({ error: 'TRANSFER_LOCATION_SAME' }, { status: 400 });
    }
    if (message === 'TO_LOCATION_REQUIRED') {
      return NextResponse.json({ error: 'TO_LOCATION_REQUIRED' }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: 'INVENTORY_TXN_CREATE_FAILED',
        details: message,
      },
      { status: 400 }
    );
  }
}
