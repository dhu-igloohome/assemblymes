import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.warehouse.findMany({
      orderBy: [{ warehouseCode: 'asc' }],
      include: {
        locations: {
          where: { isActive: true },
          orderBy: [{ locationCode: 'asc' }],
        },
      },
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'WAREHOUSE_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const warehouseCode =
      typeof body.warehouseCode === 'string' ? body.warehouseCode.trim().toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const locationCode =
      typeof body.locationCode === 'string' ? body.locationCode.trim().toUpperCase() : '';
    const locationName = typeof body.locationName === 'string' ? body.locationName.trim() : '';

    if (!/^[A-Z0-9_-]{1,16}$/.test(warehouseCode)) {
      return NextResponse.json({ error: 'WAREHOUSE_CODE_INVALID' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED' }, { status: 400 });
    }
    if (!/^[A-Z0-9_-]{1,32}$/.test(locationCode)) {
      return NextResponse.json({ error: 'LOCATION_CODE_INVALID' }, { status: 400 });
    }

    const created = await prisma.warehouse.create({
      data: {
        warehouseCode,
        name,
        locations: {
          create: {
            locationCode,
            name: locationName || null,
            isActive: true,
          },
        },
      },
      include: {
        locations: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'WAREHOUSE_CODE_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: 'WAREHOUSE_CREATE_FAILED',
      },
      { status: 400 }
    );
  }
}
