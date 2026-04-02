import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTenantSubscription } from '@/lib/tenant-subscription';

const WORK_ORDER_STATUS_OPTIONS = [
  'PLANNED',
  'RELEASED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

type WorkOrderStatus = (typeof WORK_ORDER_STATUS_OPTIONS)[number];

function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return WORK_ORDER_STATUS_OPTIONS.includes(value as WorkOrderStatus);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sub = await getCurrentTenantSubscription();
    if (sub?.readOnly) {
      return NextResponse.json({ error: 'SUBSCRIPTION_READ_ONLY' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const statusRaw = typeof body.status === 'string' ? body.status.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'WORK_ORDER_NOT_FOUND' }, { status: 404 });
    }

    const data: { status?: WorkOrderStatus; notes?: string | null } = {};
    if (statusRaw) {
      if (!isWorkOrderStatus(statusRaw)) {
        return NextResponse.json({ error: 'WORK_ORDER_STATUS_INVALID' }, { status: 400 });
      }
      data.status = statusRaw;
    }
    if (notes !== undefined) {
      data.notes = notes || null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'WORK_ORDER_UPDATE_FAILED' }, { status: 400 });
  }
}

