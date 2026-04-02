import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expandPairedRanges } from '@/lib/execution-range';
import type {
  ExecutionStage,
  ExecutionStatus,
  ExecutionTaskType,
} from '@prisma/client';

const TASK_TYPES: ExecutionTaskType[] = ['DFU', 'FLASH_REWORK', 'BIND_VERIFY'];
const STAGES: ExecutionStage[] = ['PCBA', 'ASSEMBLY_EOL', 'FINISHED_GOODS'];
const INITIAL_STATUSES: ExecutionStatus[] = ['READY', 'NEED_DFU', 'BLOCKED'];

export async function GET() {
  try {
    const rows = await prisma.assemblyExecutionTask.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 300,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'EXECUTION_TASK_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const skuItemCode =
      typeof body.skuItemCode === 'string' ? body.skuItemCode.trim() : '';
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const serialNo = typeof body.serialNo === 'string' ? body.serialNo.trim().toUpperCase() : '';
    const bluetoothId =
      typeof body.bluetoothId === 'string' ? body.bluetoothId.trim().toUpperCase() : '';
    const serialStart = typeof body.serialStart === 'string' ? body.serialStart : '';
    const serialEnd = typeof body.serialEnd === 'string' ? body.serialEnd : '';
    const bluetoothStart = typeof body.bluetoothStart === 'string' ? body.bluetoothStart : '';
    const bluetoothEnd = typeof body.bluetoothEnd === 'string' ? body.bluetoothEnd : '';
    const assignee = typeof body.assignee === 'string' ? body.assignee.trim() : '';

    const taskType = String(body.taskType ?? '') as ExecutionTaskType;
    const stage = String(body.stage ?? '') as ExecutionStage;
    const status = String(body.status ?? '') as ExecutionStatus;

    if (!/^\d{6}$/.test(skuItemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!batchNo) {
      return NextResponse.json({ error: 'BATCH_NO_REQUIRED' }, { status: 400 });
    }
    if (!TASK_TYPES.includes(taskType)) {
      return NextResponse.json({ error: 'TASK_TYPE_INVALID' }, { status: 400 });
    }
    if (!STAGES.includes(stage)) {
      return NextResponse.json({ error: 'STAGE_INVALID' }, { status: 400 });
    }
    if (!INITIAL_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'STATUS_INVALID' }, { status: 400 });
    }

    const anyRangeField =
      serialStart.trim() !== '' ||
      serialEnd.trim() !== '' ||
      bluetoothStart.trim() !== '' ||
      bluetoothEnd.trim() !== '';
    const useRange =
      serialStart.trim() !== '' &&
      serialEnd.trim() !== '' &&
      bluetoothStart.trim() !== '' &&
      bluetoothEnd.trim() !== '';

    if (anyRangeField && !useRange) {
      return NextResponse.json({ error: 'RANGE_INCOMPLETE' }, { status: 400 });
    }

    if (useRange) {
      const expanded = expandPairedRanges(serialStart, serialEnd, bluetoothStart, bluetoothEnd);
      if (!expanded.ok) {
        return NextResponse.json({ error: expanded.error }, { status: 400 });
      }
      await prisma.assemblyExecutionTask.createMany({
        data: expanded.pairs.map((p) => ({
          skuItemCode,
          batchNo,
          serialNo: p.serialNo,
          bluetoothId: p.bluetoothId,
          taskType,
          stage,
          status,
          assignee: assignee || null,
        })),
      });
      return NextResponse.json(
        { created: expanded.pairs.length, batch: true as const },
        { status: 201 }
      );
    }

    if (!serialNo) {
      return NextResponse.json({ error: 'SERIAL_NO_REQUIRED' }, { status: 400 });
    }
    if (!bluetoothId) {
      return NextResponse.json({ error: 'BLUETOOTH_ID_REQUIRED' }, { status: 400 });
    }

    const created = await prisma.assemblyExecutionTask.create({
      data: {
        skuItemCode,
        batchNo,
        serialNo,
        bluetoothId,
        taskType,
        stage,
        status,
        assignee: assignee || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('serial_no')) {
      return NextResponse.json({ error: 'SERIAL_NO_DUPLICATE' }, { status: 409 });
    }
    if (message.includes('bluetooth_id')) {
      return NextResponse.json({ error: 'BLUETOOTH_ID_DUPLICATE' }, { status: 409 });
    }
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'TASK_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'EXECUTION_TASK_CREATE_FAILED' }, { status: 400 });
  }
}

