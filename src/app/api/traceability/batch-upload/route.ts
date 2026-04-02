import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  normalizeRecordsFromJsonPayload,
  parseRecordsFromCsvText,
  parseRecordsFromPlainText,
  validateUniqueRecords,
  type TraceRecordInput,
} from '@/lib/batch-trace-records';

function resolveRecords(body: Record<string, unknown>): TraceRecordInput[] | NextResponse {
  const recordsRaw = body.records;
  if (Array.isArray(recordsRaw) && recordsRaw.length > 0) {
    const normalized = normalizeRecordsFromJsonPayload(recordsRaw);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    return normalized.records;
  }

  const recordsCsv = typeof body.recordsCsv === 'string' ? body.recordsCsv : '';
  if (recordsCsv.trim() !== '') {
    const parsed = parseRecordsFromCsvText(recordsCsv);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, details: parsed.details }, { status: 400 });
    }
    return parsed.records;
  }

  const rawRecords = typeof body.recordsText === 'string' ? body.recordsText : '';
  const plain = parseRecordsFromPlainText(rawRecords);
  if (!plain.ok) {
    return NextResponse.json({ error: plain.error, details: plain.details }, { status: 400 });
  }
  return plain.records;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const batchNo = url.searchParams.get('batchNo')?.trim() ?? '';
    const where = batchNo ? { batchNo } : {};
    const rows = await prisma.batchTraceUpload.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'TRACE_UPLOAD_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
    const skuItemCode = typeof body.skuItemCode === 'string' ? body.skuItemCode.trim() : '';
    const driveFileUrl = typeof body.driveFileUrl === 'string' ? body.driveFileUrl.trim() : '';
    const uploadedBy = typeof body.uploadedBy === 'string' ? body.uploadedBy.trim() : '';

    if (!batchNo) {
      return NextResponse.json({ error: 'BATCH_NO_REQUIRED' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(skuItemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!/^https:\/\/drive\.google\.com\//i.test(driveFileUrl)) {
      return NextResponse.json({ error: 'DRIVE_URL_INVALID' }, { status: 400 });
    }

    const resolved = resolveRecords(body);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    const unique = validateUniqueRecords(resolved);
    if (!unique.ok) {
      return NextResponse.json({ error: unique.error }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const upload = await tx.batchTraceUpload.create({
        data: {
          batchNo,
          skuItemCode,
          driveFileUrl,
          uploadedBy: uploadedBy || null,
          recordCount: resolved.length,
        },
      });

      await tx.batchTraceRecord.createMany({
        data: resolved.map((row) => ({
          uploadId: upload.id,
          batchNo,
          skuItemCode,
          serialNo: row.serialNo,
          bluetoothId: row.bluetoothId,
        })),
      });

      return upload;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('serial_no')) {
      return NextResponse.json({ error: 'SERIAL_NO_DUPLICATE' }, { status: 409 });
    }
    if (message.includes('bluetooth_id')) {
      return NextResponse.json({ error: 'BLUETOOTH_ID_DUPLICATE' }, { status: 409 });
    }
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'TRACE_RECORD_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'TRACE_UPLOAD_CREATE_FAILED' }, { status: 400 });
  }
}
