import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/services/audit-service';

const TYPE_OPTIONS = ['MATERIAL', 'LABOR', 'OVERHEAD', 'ADJUSTMENT'] as const;
type CostEntryType = (typeof TYPE_OPTIONS)[number];

function isEntryType(value: string): value is CostEntryType {
  return TYPE_OPTIONS.includes(value as CostEntryType);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workOrderNo = (searchParams.get('workOrderNo') ?? '').trim();
    const rows = await prisma.costEntry.findMany({
      where: workOrderNo
        ? {
            workOrder: {
              workOrderNo,
            },
          }
        : undefined,
      include: {
        workOrder: {
          select: {
            workOrderNo: true,
            skuItemCode: true,
            batchNo: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 300,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'COST_ENTRY_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workOrderNo = typeof body.workOrderNo === 'string' ? body.workOrderNo.trim() : '';
    const entryTypeRaw = typeof body.entryType === 'string' ? body.entryType.trim() : '';
    const amountNum =
      typeof body.amount === 'number' ? body.amount : Number.parseFloat(String(body.amount ?? ''));
    const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'CNY';
    const sourceType = typeof body.sourceType === 'string' ? body.sourceType.trim() : '';
    const sourceRef = typeof body.sourceRef === 'string' ? body.sourceRef.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const createdBy = typeof body.createdBy === 'string' ? body.createdBy.trim() : '';

    if (!isEntryType(entryTypeRaw)) {
      return NextResponse.json({ error: 'COST_ENTRY_TYPE_INVALID' }, { status: 400 });
    }
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: 'COST_ENTRY_AMOUNT_INVALID' }, { status: 400 });
    }
    if (!/^[A-Z]{3,8}$/.test(currency)) {
      return NextResponse.json({ error: 'COST_ENTRY_CURRENCY_INVALID' }, { status: 400 });
    }

    let workOrderId: string | null = null;
    if (workOrderNo) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { workOrderNo },
        select: { id: true },
      });
      if (!workOrder) {
        return NextResponse.json({ error: 'WORK_ORDER_NOT_FOUND' }, { status: 404 });
      }
      workOrderId = workOrder.id;
    }

    const row = await prisma.costEntry.create({
      data: {
        workOrderId,
        entryType: entryTypeRaw,
        amount: amountNum,
        currency,
        sourceType: sourceType || null,
        sourceRef: sourceRef || null,
        notes: notes || null,
        createdBy: createdBy || null,
      },
      include: {
        workOrder: {
          select: { workOrderNo: true, skuItemCode: true, batchNo: true },
        },
      },
    });

    // Record audit log for cost adjustment
    void createAuditLog({
      action: 'CREATE_COST_ENTRY',
      entity: 'CostEntry',
      entityId: row.id,
      operator: createdBy || 'SYSTEM',
      details: `Created ${entryTypeRaw} entry of ${amountNum} ${currency} for WO ${workOrderNo}`,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'COST_ENTRY_SAVE_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
