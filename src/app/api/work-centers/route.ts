import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isWorkCenterType } from '@/lib/work-center';

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export async function GET() {
  try {
    const rows = await prisma.workCenter.findMany({
      orderBy: { workCenterCode: 'asc' },
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to fetch work centers.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workCenterCode =
      typeof body.workCenterCode === 'string' ? body.workCenterCode.trim().toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const type = typeof body.type === 'string' ? body.type : '';
    const rawCap = body.dailyCapacity;
    let dailyCapacity: number | null = null;
    if (rawCap !== undefined && rawCap !== null && rawCap !== '') {
      const parsed = parseOptionalInt(rawCap);
      if (parsed === undefined || parsed === null) {
        return NextResponse.json({ error: 'Invalid daily capacity value.' }, { status: 400 });
      }
      dailyCapacity = parsed;
    }

    if (!/^[A-Z0-9_-]{1,16}$/.test(workCenterCode)) {
      return NextResponse.json(
        {
          error: 'Invalid work center code.',
          details: 'Use 1–16 characters: letters, digits, underscore, or hyphen.',
        },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!isWorkCenterType(type)) {
      return NextResponse.json({ error: 'Invalid work center type.' }, { status: 400 });
    }

    const created = await prisma.workCenter.create({
      data: {
        workCenterCode,
        name,
        type,
        dailyCapacity,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Work center code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create work center.', details: message }, { status: 400 });
  }
}
