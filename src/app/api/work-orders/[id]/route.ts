import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoFinishWorkOrder, autoIssueMaterialsForWorkOrder } from '@/lib/services/sales-order-automation';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

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
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'PLANNER' && session.role !== 'PRODUCTION') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const statusRaw = typeof body.status === 'string' ? body.status.trim() : '';
    const operator = session.employeeName || session.username;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'WORK_ORDER_NOT_FOUND' }, { status: 404 });
    }
    const finishedQtyNum =
      typeof body.finishedQty === 'number'
        ? body.finishedQty
        : Number.parseInt(String(body.finishedQty ?? existing.plannedQty), 10);

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
    if (statusRaw === 'RELEASED') {
      await autoIssueMaterialsForWorkOrder(id, operator || 'system');
    }
    if (statusRaw === 'DONE') {
      // In the new reporting model, FG is received when the last operation completes
      // We don't want to double receive here unless it's a manual override.
      // We'll skip autoFinishWorkOrder since we use the /api/execution/report endpoint.
      // But we can still support autoFinishWorkOrder for manual override from the Work Orders screen if needed.
      // For now, if someone clicks Finish from the Work Order list, we'll keep the autoFinish.
      const qty = Number.isInteger(finishedQtyNum) && finishedQtyNum > 0 ? finishedQtyNum : existing.plannedQty;
      await autoFinishWorkOrder(id, qty, operator || 'system');
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'WORK_ORDER_UPDATE_FAILED' }, { status: 400 });
  }
}

