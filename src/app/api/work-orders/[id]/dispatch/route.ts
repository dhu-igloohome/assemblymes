import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type DispatchAction = 'ASSIGN' | 'START' | 'PAUSE' | 'COMPLETE';

function isDispatchAction(value: string): value is DispatchAction {
  return value === 'ASSIGN' || value === 'START' || value === 'PAUSE' || value === 'COMPLETE';
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
    const actionRaw = typeof body.action === 'string' ? body.action.trim() : '';
    const workstation = typeof body.workstation === 'string' ? body.workstation.trim() : '';
    const assignee = typeof body.assignee === 'string' ? body.assignee.trim() : '';
    const pauseReason = typeof body.pauseReason === 'string' ? body.pauseReason.trim() : '';
    const completedQtyNum =
      typeof body.completedQty === 'number'
        ? body.completedQty
        : Number.parseInt(String(body.completedQty ?? ''), 10);

    if (!isDispatchAction(actionRaw)) {
      return NextResponse.json({ error: 'DISPATCH_ACTION_INVALID' }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { id: true, plannedQty: true, status: true },
    });
    if (!workOrder) {
      return NextResponse.json({ error: 'WORK_ORDER_NOT_FOUND' }, { status: 404 });
    }

    if (actionRaw === 'ASSIGN') {
      if (!workstation) {
        return NextResponse.json({ error: 'WORKSTATION_REQUIRED' }, { status: 400 });
      }
      const created = await prisma.workOrderDispatch.create({
        data: {
          workOrderId: id,
          workstation,
          assignee: assignee || null,
          status: 'ASSIGNED',
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    const latest = await prisma.workOrderDispatch.findFirst({
      where: { workOrderId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!latest) {
      return NextResponse.json({ error: 'DISPATCH_NOT_FOUND' }, { status: 404 });
    }

    if (actionRaw === 'START') {
      const updated = await prisma.$transaction(async (tx) => {
        const dispatch = await tx.workOrderDispatch.update({
          where: { id: latest.id },
          data: {
            status: 'STARTED',
            startedAt: new Date(),
            pauseReason: null,
          },
        });
        await tx.workOrder.update({
          where: { id },
          data: { status: 'IN_PROGRESS' },
        });
        return dispatch;
      });
      return NextResponse.json(updated);
    }

    if (actionRaw === 'PAUSE') {
      if (!pauseReason) {
        return NextResponse.json({ error: 'PAUSE_REASON_REQUIRED' }, { status: 400 });
      }
      const updated = await prisma.workOrderDispatch.update({
        where: { id: latest.id },
        data: {
          status: 'PAUSED',
          pauseReason,
        },
      });
      return NextResponse.json(updated);
    }

    if (!Number.isFinite(completedQtyNum) || completedQtyNum < 0) {
      return NextResponse.json({ error: 'COMPLETED_QTY_INVALID' }, { status: 400 });
    }
    if (completedQtyNum > workOrder.plannedQty) {
      return NextResponse.json({ error: 'COMPLETED_QTY_EXCEEDS_PLANNED' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.workOrderDispatch.update({
        where: { id: latest.id },
        data: {
          status: 'COMPLETED',
          completedQty: Math.trunc(completedQtyNum),
          completedAt: new Date(),
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: {
          status: completedQtyNum >= workOrder.plannedQty ? 'DONE' : workOrder.status,
        },
      });

      return dispatch;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'DISPATCH_ACTION_FAILED' }, { status: 400 });
  }
}

