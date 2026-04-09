import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [orders, invoices, payments, orderCosts, shipments] = await Promise.all([
      prisma.salesOrder.findMany({
        select: {
          id: true,
          orderNo: true,
          customerName: true,
          skuItemCode: true,
          orderedQty: true,
          unitPrice: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 300,
      }),
      prisma.invoice.findMany({
        select: {
          id: true,
          salesOrderId: true,
          amount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
      }),
      prisma.payment.findMany({
        select: {
          invoiceId: true,
          amount: true,
        },
        take: 1000,
      }),
      prisma.costEntry.groupBy({
        by: ['workOrderId'],
        where: { workOrderId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.shipment.findMany({
        select: {
          id: true,
          shipmentNo: true,
          salesOrderId: true,
          shippedQty: true,
          shippedAt: true,
          logisticsNo: true,
          warehouseCode: true,
        },
        orderBy: [{ shippedAt: 'desc' }],
        take: 500,
      }),
    ]);

    const paymentByInvoice = new Map<string, number>();
    for (const p of payments) {
      paymentByInvoice.set(p.invoiceId, (paymentByInvoice.get(p.invoiceId) ?? 0) + Number(p.amount));
    }

    const invoiceByOrder = new Map<string, { billed: number; received: number }>();
    for (const inv of invoices) {
      const existing = invoiceByOrder.get(inv.salesOrderId) ?? { billed: 0, received: 0 };
      existing.billed += Number(inv.amount);
      existing.received += paymentByInvoice.get(inv.id) ?? Number(inv.paidAmount ?? 0);
      invoiceByOrder.set(inv.salesOrderId, existing);
    }

    const revenueTotal = orders.reduce(
      (sum, o) => sum + Number(o.unitPrice) * o.orderedQty,
      0
    );
    const billedTotal = Array.from(invoiceByOrder.values()).reduce((sum, v) => sum + v.billed, 0);
    const receivedTotal = Array.from(invoiceByOrder.values()).reduce((sum, v) => sum + v.received, 0);
    const arTotal = billedTotal - receivedTotal;
    const shippedQtyTotal = shipments.reduce((sum, s) => sum + s.shippedQty, 0);

    const costByWorkOrder = new Map<string, number>();
    for (const row of orderCosts) {
      if (!row.workOrderId) continue;
      costByWorkOrder.set(row.workOrderId, Number(row._sum.amount ?? 0));
    }

    const orderProfitRows = orders.map((o) => {
      const revenue = Number(o.unitPrice) * o.orderedQty;
      const billedInfo = invoiceByOrder.get(o.id) ?? { billed: 0, received: 0 };
      const orderShipments = shipments.filter((s) => s.salesOrderId === o.id);
      const shippedQty = orderShipments.reduce((sum, s) => sum + s.shippedQty, 0);
      return {
        orderNo: o.orderNo,
        customerName: o.customerName,
        skuItemCode: o.skuItemCode,
        status: o.status,
        revenue,
        shippedQty,
        billed: billedInfo.billed,
        received: billedInfo.received,
      };
    });

    return NextResponse.json({
      summary: {
        orderCount: orders.length,
        revenueTotal,
        billedTotal,
        receivedTotal,
        arTotal,
        shippedQtyTotal,
        linkedCostWorkOrders: costByWorkOrder.size,
      },
      orderProfitRows,
      recentShipments: shipments.slice(0, 50),
      recentInvoices: invoices.slice(0, 50),
      recentPayments: payments.slice(0, 100),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'O2C_DASHBOARD_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
