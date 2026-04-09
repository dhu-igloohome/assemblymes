import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function nextInvoiceNo() {
  return `INV-${Date.now()}`;
}

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
    const amount =
      typeof body.amount === 'number'
        ? body.amount
        : Number.parseFloat(String(body.amount ?? ''));
    const dueDateRaw = typeof body.dueDate === 'string' ? body.dueDate : '';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const invoiceType = typeof body.invoiceType === 'string' ? body.invoiceType.trim().toUpperCase() : 'STANDARD';

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'INVOICE_AMOUNT_INVALID' }, { status: 400 });
    }
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    if (dueDateRaw && Number.isNaN(dueDate?.getTime())) {
      return NextResponse.json({ error: 'DUE_DATE_INVALID' }, { status: 400 });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { invoices: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'SALES_ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (!['PARTIALLY_SHIPPED', 'SHIPPED', 'CLOSED'].includes(order.status)) {
      return NextResponse.json({ error: 'SO_STATUS_INVALID' }, { status: 400 });
    }

    const billed = order.invoices.reduce((sum, row) => sum + Number(row.amount), 0);
    const orderAmount = Number(order.unitPrice) * order.orderedQty;
    if (billed + amount > orderAmount) {
      return NextResponse.json({ error: 'INVOICE_AMOUNT_EXCEEDS_ORDER' }, { status: 400 });
    }

    const invoiceNo = nextInvoiceNo();
    const created = await prisma.invoice.create({
      data: {
        salesOrderId: order.id,
        invoiceNo,
        status: 'ISSUED',
        invoiceType,
        invoiceDate: new Date(),
        issuedAt: new Date(),
        amount,
        paidAmount: 0,
        currency: order.currency,
        dueDate: dueDate ?? null,
        notes: notes || null,
        createdBy: createdBy || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'INVOICE_CREATE_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
