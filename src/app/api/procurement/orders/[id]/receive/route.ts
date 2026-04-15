import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const session = await parseSessionCookieValue(sessionCookie?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'INVENTORY') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    const body = (await request.json()) as Record<string, unknown>;
    const lineId = typeof body.lineId === 'string' ? body.lineId.trim() : '';
    const locationId = typeof body.locationId === 'string' ? body.locationId.trim() : '';
    const operator = session.employeeName || session.username;
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const receivedQty =
      typeof body.receivedQty === 'number'
        ? body.receivedQty
        : Number.parseFloat(String(body.receivedQty ?? ''));

    if (!lineId) return NextResponse.json({ error: 'LINE_ID_REQUIRED' }, { status: 400 });
    if (!locationId) return NextResponse.json({ error: 'LOCATION_REQUIRED' }, { status: 400 });
    if (!Number.isFinite(receivedQty) || receivedQty <= 0) {
      return NextResponse.json({ error: 'RECEIVED_QTY_INVALID' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!po) throw new Error('PURCHASE_ORDER_NOT_FOUND');
      if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) throw new Error('PO_STATUS_INVALID');

      const line = po.lines.find((entry) => entry.id === lineId);
      if (!line) throw new Error('PURCHASE_ORDER_LINE_NOT_FOUND');

      const qty = new Prisma.Decimal(receivedQty);
      const remaining = line.orderedQty.minus(line.receivedQty);
      if (remaining.lessThan(qty)) throw new Error('RECEIVED_QTY_EXCEEDS_ORDER');

      const location = await tx.storageLocation.findUnique({
        where: { id: locationId },
        include: { warehouse: true },
      });
      if (!location) throw new Error('LOCATION_NOT_FOUND');

      const bal = await tx.inventoryBalance.findUnique({
        where: { itemCode_locationId: { itemCode: line.itemCode, locationId } },
      });
      const current = bal?.quantity ?? new Prisma.Decimal(0);
      await tx.inventoryBalance.upsert({
        where: { itemCode_locationId: { itemCode: line.itemCode, locationId } },
        create: { itemCode: line.itemCode, locationId, quantity: current.plus(qty) },
        update: { quantity: current.plus(qty) },
      });

      const inventoryTxn = await tx.inventoryTxn.create({
        data: {
          txnType: 'IN',
          itemCode: line.itemCode,
          quantity: qty,
          batchNo: batchNo || null,
          toLocationId: locationId,
          refType: 'PURCHASE_ORDER',
          refNo: po.poNo,
          operator: operator || null,
          remarks: `PO receive ${po.poNo}`,
        },
      });

      const updatedLine = await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: line.receivedQty.plus(qty) },
      });

      await tx.purchaseReceipt.create({
        data: {
          purchaseOrderId: po.id,
          lineId: line.id,
          inventoryTxnId: inventoryTxn.id,
          locationId,
          receivedQty: qty,
          batchNo: batchNo || null,
          operator: operator || null,
        },
      });

      await tx.qualityInspection.create({
        data: {
          inspectionNo: `IQC-${po.poNo}-${Date.now()}`,
          stage: 'IQC',
          result: 'PENDING',
          itemCode: line.itemCode,
          batchNo: batchNo || null,
          workOrderNo: null,
          sampleSize: Number(receivedQty),
          defectQty: 0,
          issueSummary: null,
          disposition: 'Auto-created from PO receiving',
          inspectedBy: operator || 'system',
          inspectedAt: new Date(),
        },
      });

      const allLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } });
      const allReceived = allLines.every((entry) => entry.receivedQty.greaterThanOrEqualTo(entry.orderedQty));
      const hasReceived = allLines.some((entry) => entry.receivedQty.greaterThan(0));
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived ? 'RECEIVED' : hasReceived ? 'PARTIALLY_RECEIVED' : po.status,
        },
      });

      return updatedLine;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      [
        'PURCHASE_ORDER_NOT_FOUND',
        'PO_STATUS_INVALID',
        'PURCHASE_ORDER_LINE_NOT_FOUND',
        'RECEIVED_QTY_EXCEEDS_ORDER',
        'LOCATION_NOT_FOUND',
      ].includes(message)
    ) {
      return NextResponse.json({ error: message }, { status: message.endsWith('NOT_FOUND') ? 404 : 400 });
    }
    return NextResponse.json({ error: 'PURCHASE_ORDER_RECEIVE_FAILED', details: message }, { status: 500 });
  }
}
