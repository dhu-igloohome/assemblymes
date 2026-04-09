import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

function nextShipmentNo() {
  return `SHP-${Date.now()}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'INVENTORY') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const shippedQty =
      typeof body.shippedQty === 'number'
        ? body.shippedQty
        : Number.parseInt(String(body.shippedQty ?? ''), 10);
    const locationId = typeof body.locationId === 'string' ? body.locationId.trim() : '';
    const logisticsNo = typeof body.logisticsNo === 'string' ? body.logisticsNo.trim() : '';
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';
    const operator = session.employeeName || session.username;

    if (!Number.isInteger(shippedQty) || shippedQty <= 0) {
      return NextResponse.json({ error: 'SHIP_QTY_INVALID' }, { status: 400 });
    }
    if (!locationId) {
      return NextResponse.json({ error: 'LOCATION_REQUIRED' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { shipments: true },
      });
      if (!order) {
        throw new Error('SALES_ORDER_NOT_FOUND');
      }
      if (!['CONFIRMED', 'PARTIALLY_SHIPPED'].includes(order.status)) {
        throw new Error('SO_STATUS_INVALID');
      }

      const shippedAlready = order.shipments.reduce((sum, row) => sum + row.shippedQty, 0);
      if (shippedAlready + shippedQty > order.orderedQty) {
        throw new Error('SHIP_QTY_EXCEEDS_ORDER');
      }

      const location = await tx.storageLocation.findUnique({
        where: { id: locationId },
        include: { warehouse: true },
      });
      if (!location) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      const balance = await tx.inventoryBalance.findUnique({
        where: {
          itemCode_locationId: {
            itemCode: order.skuItemCode,
            locationId,
          },
        },
      });
      const current = balance?.quantity ?? new Prisma.Decimal(0);
      const deduct = new Prisma.Decimal(shippedQty);
      if (current.lessThan(deduct)) {
        throw new Error('INVENTORY_NOT_ENOUGH');
      }

      await tx.inventoryBalance.upsert({
        where: {
          itemCode_locationId: {
            itemCode: order.skuItemCode,
            locationId,
          },
        },
        create: {
          itemCode: order.skuItemCode,
          locationId,
          quantity: new Prisma.Decimal(0).minus(deduct), // Should not happen in create if checked before, but for consistency
        },
        update: {
          quantity: { decrement: deduct },
        },
      });

      const shipmentNo = nextShipmentNo();
      const shipment = await tx.shipment.create({
        data: {
          shipmentNo,
          salesOrderId: order.id,
          shippedQty,
          status: 'POSTED',
          postedAt: new Date(),
          logisticsNo: logisticsNo || null,
          warehouseCode: location.warehouse.warehouseCode,
          locationId,
          remarks: remarks || null,
          createdBy: operator || null,
          operator: operator || null,
        },
      });

      await tx.inventoryTxn.create({
        data: {
          txnType: 'OUT',
          itemCode: order.skuItemCode,
          quantity: deduct,
          batchNo: order.batchNo || null,
          fromLocationId: locationId,
          refType: 'SALES_SHIPMENT',
          refNo: shipmentNo,
          operator: operator || null,
          remarks: remarks || `Shipment ${shipmentNo}`,
        },
      });

      const totalShipped = shippedAlready + shippedQty;
      const nextStatus = totalShipped >= order.orderedQty ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });

      return shipment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      [
        'SALES_ORDER_NOT_FOUND',
        'SO_STATUS_INVALID',
        'SHIP_QTY_EXCEEDS_ORDER',
        'INVENTORY_NOT_ENOUGH',
        'LOCATION_NOT_FOUND',
      ].includes(message)
    ) {
      return NextResponse.json({ error: message }, { status: message.endsWith('NOT_FOUND') ? 404 : 400 });
    }
    return NextResponse.json(
      {
        error: 'SHIPMENT_CREATE_FAILED',
        details: message,
      },
      { status: 500 }
    );
  }
}
