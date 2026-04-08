import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STATUS_OPTIONS = [
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'CLOSED',
  'CANCELLED',
] as const;

type SalesOrderStatus = (typeof STATUS_OPTIONS)[number];

function isStatus(value: string): value is SalesOrderStatus {
  return STATUS_OPTIONS.includes(value as SalesOrderStatus);
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export async function GET() {
  try {
    const rows = await prisma.salesOrder.findMany({
      include: {
        shipments: true,
        invoices: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'SALES_ORDER_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderNo = typeof body.orderNo === 'string' ? body.orderNo.trim().toUpperCase() : '';
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const skuItemCode = typeof body.skuItemCode === 'string' ? body.skuItemCode.trim() : '';
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'CNY';
    const statusRaw = typeof body.status === 'string' ? body.status.trim() : 'DRAFT';
    const orderedQtyNum =
      typeof body.orderedQty === 'number'
        ? body.orderedQty
        : Number.parseInt(String(body.orderedQty ?? ''), 10);
    const unitPriceNum =
      typeof body.unitPrice === 'number'
        ? body.unitPrice
        : Number.parseFloat(String(body.unitPrice ?? ''));
    const dueDate = parseOptionalDate(body.dueDate);

    if (!/^[A-Z0-9_-]{1,32}$/.test(orderNo)) {
      return NextResponse.json({ error: 'SALES_ORDER_NO_INVALID' }, { status: 400 });
    }
    if (!customerName) {
      return NextResponse.json({ error: 'CUSTOMER_NAME_REQUIRED' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(skuItemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!Number.isInteger(orderedQtyNum) || orderedQtyNum <= 0) {
      return NextResponse.json({ error: 'ORDERED_QTY_INVALID' }, { status: 400 });
    }
    if (!Number.isFinite(unitPriceNum) || unitPriceNum < 0) {
      return NextResponse.json({ error: 'UNIT_PRICE_INVALID' }, { status: 400 });
    }
    if (!/^[A-Z]{3,8}$/.test(currency)) {
      return NextResponse.json({ error: 'CURRENCY_INVALID' }, { status: 400 });
    }
    if (!isStatus(statusRaw)) {
      return NextResponse.json({ error: 'SALES_ORDER_STATUS_INVALID' }, { status: 400 });
    }
    if (dueDate === undefined) {
      return NextResponse.json({ error: 'DUE_DATE_INVALID' }, { status: 400 });
    }

    const skuExists = await prisma.item.findUnique({
      where: { itemCode: skuItemCode },
      select: { itemCode: true },
    });
    if (!skuExists) {
      return NextResponse.json({ error: 'SKU_NOT_FOUND' }, { status: 404 });
    }

    const row = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerName,
        skuItemCode,
        batchNo: batchNo || null,
        orderedQty: orderedQtyNum,
        unitPrice: unitPriceNum,
        currency,
        dueDate,
        status: statusRaw,
        notes: notes || null,
        createdBy: createdBy || null,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'SALES_ORDER_NO_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: 'SALES_ORDER_SAVE_FAILED',
        details: message,
      },
      { status: 500 }
    );
  }
}
