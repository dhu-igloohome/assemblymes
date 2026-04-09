import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function nextPaymentNo() {
  return `PAY-${Date.now()}`;
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
    const method = typeof body.method === 'string' ? body.method.trim() : '';
    const referenceNo = typeof body.referenceNo === 'string' ? body.referenceNo.trim() : '';
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'PAYMENT_AMOUNT_INVALID' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id } });
      if (!invoice) throw new Error('INVOICE_NOT_FOUND');
      if (invoice.status === 'VOID') throw new Error('INVOICE_STATUS_INVALID');

      const paid = Number(invoice.paidAmount);
      if (paid + amount > Number(invoice.amount)) {
        throw new Error('PAYMENT_EXCEEDS_INVOICE');
      }

      const payment = await tx.payment.create({
        data: {
          paymentNo: nextPaymentNo(),
          invoiceId: id,
          amount,
          currency: invoice.currency,
          method: method || null,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
          createdBy: createdBy || null,
        },
      });

      const nextPaid = paid + amount;
      const nextStatus =
        nextPaid >= Number(invoice.amount) ? 'PAID' : nextPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED';
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: nextPaid,
          status: nextStatus,
        },
      });

      const allInvoices = await tx.invoice.findMany({
        where: { salesOrderId: invoice.salesOrderId, status: { not: 'VOID' } },
        select: { status: true },
      });
      const allPaid = allInvoices.length > 0 && allInvoices.every((entry) => entry.status === 'PAID');
      if (allPaid) {
        await tx.salesOrder.update({
          where: { id: invoice.salesOrderId },
          data: { status: 'CLOSED' },
        });
      }

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (['INVOICE_NOT_FOUND', 'INVOICE_STATUS_INVALID', 'PAYMENT_EXCEEDS_INVOICE'].includes(message)) {
      return NextResponse.json({ error: message }, { status: message === 'INVOICE_NOT_FOUND' ? 404 : 400 });
    }
    return NextResponse.json(
      {
        error: 'PAYMENT_CREATE_FAILED',
        details: message,
      },
      { status: 500 }
    );
  }
}
