import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface UploadRecordInput {
  serialNo: string;
  bluetoothId: string;
}

function parseLine(line: string): UploadRecordInput | null {
  const parts = line
    .split(/[,\t;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return {
    serialNo: parts[0].toUpperCase(),
    bluetoothId: parts[1].toUpperCase(),
  };
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
    const rawRecords = typeof body.recordsText === 'string' ? body.recordsText : '';

    if (!batchNo) {
      return NextResponse.json({ error: 'BATCH_NO_REQUIRED' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(skuItemCode)) {
      return NextResponse.json({ error: 'SKU_ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (!/^https:\/\/drive\.google\.com\//i.test(driveFileUrl)) {
      return NextResponse.json({ error: 'DRIVE_URL_INVALID' }, { status: 400 });
    }

    const lines = rawRecords
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'TRACE_RECORDS_REQUIRED' }, { status: 400 });
    }

    const parsed: UploadRecordInput[] = [];
    for (const line of lines) {
      const record = parseLine(line);
      if (!record) {
        return NextResponse.json({ error: 'TRACE_LINE_INVALID', details: line }, { status: 400 });
      }
      parsed.push(record);
    }

    const serialSet = new Set<string>();
    const bluetoothSet = new Set<string>();
    for (const row of parsed) {
      if (!row.serialNo) {
        return NextResponse.json({ error: 'SERIAL_NO_REQUIRED' }, { status: 400 });
      }
      if (!row.bluetoothId) {
        return NextResponse.json({ error: 'BLUETOOTH_ID_REQUIRED' }, { status: 400 });
      }
      if (serialSet.has(row.serialNo)) {
        return NextResponse.json({ error: 'SERIAL_NO_DUPLICATE_IN_FILE' }, { status: 400 });
      }
      if (bluetoothSet.has(row.bluetoothId)) {
        return NextResponse.json({ error: 'BLUETOOTH_ID_DUPLICATE_IN_FILE' }, { status: 400 });
      }
      serialSet.add(row.serialNo);
      bluetoothSet.add(row.bluetoothId);
    }

    const result = await prisma.$transaction(async (tx) => {
      const upload = await tx.batchTraceUpload.create({
        data: {
          batchNo,
          skuItemCode,
          driveFileUrl,
          uploadedBy: uploadedBy || null,
          recordCount: parsed.length,
        },
      });

      await tx.batchTraceRecord.createMany({
        data: parsed.map((row) => ({
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

