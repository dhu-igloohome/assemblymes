import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const rows = await prisma.workOrder.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'WORK_ORDER_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workOrderNo =
      typeof body.workOrderNo === 'string' ? body.workOrderNo.trim().toUpperCase() : '';
    const skuItemCode =
      typeof body.skuItemCode === 'string' ? body.skuItemCode.trim() : '';
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const targetVersion =
      typeof body.targetVersion === 'string' ? body.targetVersion.trim() : '';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const statusRaw = typeof body.status === 'string' ? body.status.trim() : 'PLANNED';
    const plannedQtyNum =
      typeof body.plannedQty === 'number'
        ? body.plannedQty
        : Number.parseInt(String(body.plannedQty ?? ''), 10);
    const planStartDate = parseOptionalDate(body.planStartDate);
    const planEndDate = parseOptionalDate(body.planEndDate);

    if (!/^[A-Z0-9_-]{1,32}$/.test(workOrderNo)) {
      return NextResponse.json({ error: 'WORK_ORDER_NO_INVALID' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(skuItemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!batchNo) {
      return NextResponse.json({ error: 'BATCH_NO_REQUIRED' }, { status: 400 });
    }
    if (!Number.isFinite(plannedQtyNum) || plannedQtyNum <= 0) {
      return NextResponse.json({ error: 'PLANNED_QTY_INVALID' }, { status: 400 });
    }
    if (!isWorkOrderStatus(statusRaw)) {
      return NextResponse.json({ error: 'WORK_ORDER_STATUS_INVALID' }, { status: 400 });
    }
    if (planStartDate === undefined || planEndDate === undefined) {
      return NextResponse.json({ error: 'PLAN_DATE_INVALID' }, { status: 400 });
    }

    const sku = await prisma.item.findUnique({
      where: { itemCode: skuItemCode },
      select: { itemCode: true, itemType: true },
    });
    if (!sku) {
      return NextResponse.json({ error: 'SKU_NOT_FOUND' }, { status: 404 });
    }
    if (sku.itemType === 'MATERIAL') {
      return NextResponse.json({ error: 'WORK_ORDER_SKU_TYPE_INVALID' }, { status: 400 });
    }

    const created = await prisma.workOrder.create({
      data: {
        workOrderNo,
        skuItemCode,
        batchNo,
        plannedQty: Math.trunc(plannedQtyNum),
        targetVersion: targetVersion || null,
        status: statusRaw,
        planStartDate,
        planEndDate,
        createdBy: createdBy || null,
        notes: notes || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'WORK_ORDER_NO_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'WORK_ORDER_CREATE_FAILED' }, { status: 400 });
  }
}

