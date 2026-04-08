import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STAGE_OPTIONS = ['IQC', 'IPQC', 'OQC'] as const;
const RESULT_OPTIONS = ['PENDING', 'PASS', 'FAIL'] as const;

type InspectionStage = (typeof STAGE_OPTIONS)[number];
type InspectionResult = (typeof RESULT_OPTIONS)[number];

function isStage(value: string): value is InspectionStage {
  return STAGE_OPTIONS.includes(value as InspectionStage);
}

function isResult(value: string): value is InspectionResult {
  return RESULT_OPTIONS.includes(value as InspectionResult);
}

export async function GET() {
  try {
    const rows = await prisma.qualityInspection.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'QUALITY_INSPECTION_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const inspectionNo =
      typeof body.inspectionNo === 'string' ? body.inspectionNo.trim().toUpperCase() : '';
    const stageRaw = typeof body.stage === 'string' ? body.stage.trim() : '';
    const resultRaw = typeof body.result === 'string' ? body.result.trim() : 'PENDING';
    const itemCode = typeof body.itemCode === 'string' ? body.itemCode.trim() : '';
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const workOrderNo = typeof body.workOrderNo === 'string' ? body.workOrderNo.trim() : '';
    const issueSummary = typeof body.issueSummary === 'string' ? body.issueSummary.trim() : '';
    const disposition = typeof body.disposition === 'string' ? body.disposition.trim() : '';
    const inspectedBy = typeof body.inspectedBy === 'string' ? body.inspectedBy.trim() : '';
    const sampleSizeNum =
      typeof body.sampleSize === 'number'
        ? body.sampleSize
        : Number.parseInt(String(body.sampleSize ?? ''), 10);
    const defectQtyNum =
      typeof body.defectQty === 'number'
        ? body.defectQty
        : Number.parseInt(String(body.defectQty ?? ''), 10);

    if (!/^[A-Z0-9_-]{1,32}$/.test(inspectionNo)) {
      return NextResponse.json({ error: 'INSPECTION_NO_INVALID' }, { status: 400 });
    }
    if (!isStage(stageRaw)) {
      return NextResponse.json({ error: 'INSPECTION_STAGE_INVALID' }, { status: 400 });
    }
    if (!isResult(resultRaw)) {
      return NextResponse.json({ error: 'INSPECTION_RESULT_INVALID' }, { status: 400 });
    }
    if (!Number.isInteger(sampleSizeNum) || sampleSizeNum < 0) {
      return NextResponse.json({ error: 'SAMPLE_SIZE_INVALID' }, { status: 400 });
    }
    if (!Number.isInteger(defectQtyNum) || defectQtyNum < 0) {
      return NextResponse.json({ error: 'DEFECT_QTY_INVALID' }, { status: 400 });
    }
    if (defectQtyNum > sampleSizeNum) {
      return NextResponse.json({ error: 'DEFECT_QTY_EXCEEDS_SAMPLE' }, { status: 400 });
    }

    const row = await prisma.qualityInspection.create({
      data: {
        inspectionNo,
        stage: stageRaw,
        result: resultRaw,
        itemCode: itemCode || null,
        batchNo: batchNo || null,
        workOrderNo: workOrderNo || null,
        sampleSize: sampleSizeNum,
        defectQty: defectQtyNum,
        issueSummary: issueSummary || null,
        disposition: disposition || null,
        inspectedBy: inspectedBy || null,
        inspectedAt: new Date(),
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'INSPECTION_NO_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: 'QUALITY_INSPECTION_SAVE_FAILED',
        details: message,
      },
      { status: 500 }
    );
  }
}
