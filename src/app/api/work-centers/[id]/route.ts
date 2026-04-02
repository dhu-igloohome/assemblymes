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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const type = typeof body.type === 'string' ? body.type : undefined;
    const dailyCapacity = parseOptionalInt(body.dailyCapacity);

    const existing = await prisma.workCenter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Work center not found.' }, { status: 404 });
    }

    const data: {
      name?: string;
      type?: 'FLOW_LINE' | 'STANDALONE';
      dailyCapacity?: number | null;
    } = {};

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      data.name = name;
    }
    if (type !== undefined) {
      if (!isWorkCenterType(type)) {
        return NextResponse.json({ error: 'Invalid work center type.' }, { status: 400 });
      }
      data.type = type;
    }
    if (dailyCapacity !== undefined) {
      data.dailyCapacity = dailyCapacity;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.workCenter.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to update work center.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const existing = await prisma.workCenter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Work center not found.' }, { status: 404 });
    }

    await prisma.workCenter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to delete work center.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
