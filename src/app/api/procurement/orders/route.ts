import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type LineInput = {
  itemCode: string;
  orderedQty: number;
  unitPrice?: number;
};

function parseExpectedDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET() {
  try {
    const rows = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        lines: true,
        receipts: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'PROCUREMENT_ORDER_LOAD_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const poNo = typeof body.poNo === 'string' ? body.poNo.trim().toUpperCase() : '';
    const supplierCode = typeof body.supplierCode === 'string' ? body.supplierCode.trim().toUpperCase() : '';
    const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() : '';
    const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'CNY';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';
    const expectedDate = parseExpectedDate(body.expectedDate);
    const line = body.line as LineInput | undefined;

    if (!/^[A-Z0-9_-]{1,32}$/.test(poNo)) {
      return NextResponse.json({ error: 'PO_NO_INVALID' }, { status: 400 });
    }
    if (!/^[A-Z0-9_-]{1,32}$/.test(supplierCode)) {
      return NextResponse.json({ error: 'SUPPLIER_CODE_INVALID' }, { status: 400 });
    }
    if (!supplierName) {
      return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED' }, { status: 400 });
    }
    if (!/^[A-Z]{3,8}$/.test(currency)) {
      return NextResponse.json({ error: 'CURRENCY_INVALID' }, { status: 400 });
    }
    if (expectedDate === undefined) {
      return NextResponse.json({ error: 'EXPECTED_DATE_INVALID' }, { status: 400 });
    }
    if (!line || !/^\d{6}$/.test(line.itemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!Number.isFinite(line.orderedQty) || line.orderedQty <= 0) {
      return NextResponse.json({ error: 'ORDERED_QTY_INVALID' }, { status: 400 });
    }
    if (!Number.isFinite(line.unitPrice ?? 0) || (line.unitPrice ?? 0) < 0) {
      return NextResponse.json({ error: 'UNIT_PRICE_INVALID' }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { itemCode: line.itemCode }, select: { itemCode: true } });
    if (!item) return NextResponse.json({ error: 'SKU_NOT_FOUND' }, { status: 404 });

    const created = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.upsert({
        where: { supplierCode },
        update: { name: supplierName },
        create: { supplierCode, name: supplierName },
      });
      return tx.purchaseOrder.create({
        data: {
          poNo,
          supplierId: supplier.id,
          status: 'DRAFT',
          currency,
          expectedDate: expectedDate ?? null,
          createdBy: createdBy || null,
          lines: {
            create: {
              itemCode: line.itemCode,
              orderedQty: new Prisma.Decimal(line.orderedQty),
              unitPrice: new Prisma.Decimal(line.unitPrice ?? 0),
            },
          },
        },
        include: { supplier: true, lines: true },
      });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'PO_NO_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'PROCUREMENT_ORDER_CREATE_FAILED', details: message }, { status: 500 });
  }
}
