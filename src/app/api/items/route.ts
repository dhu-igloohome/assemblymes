import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ItemType } from '@prisma/client';

type ValidItemPayload = {
  itemCode: string;
  itemName: string;
  itemType: ItemType;
  unit: string;
  description: string;
};

function validateItemPayload(
  body: unknown
):
  | { valid: true; data: ValidItemPayload }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body.' };
  }

  const payload = body as Record<string, unknown>;
  const itemCode = typeof payload.itemCode === 'string' ? payload.itemCode.trim() : '';
  const itemName = typeof payload.itemName === 'string' ? payload.itemName.trim() : '';
  const itemType = typeof payload.itemType === 'string' ? payload.itemType.trim() : '';
  const unit = typeof payload.unit === 'string' ? payload.unit.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';

  if (!/^\d{6}$/.test(itemCode)) {
    return { valid: false, error: 'Item code must be exactly 6 digits.' };
  }

  if (!itemName) {
    return { valid: false, error: 'Item name is required.' };
  }

  if (!['PRODUCT', 'ASSEMBLY', 'MATERIAL'].includes(itemType)) {
    return { valid: false, error: 'Item type is invalid.' };
  }

  if (!unit) {
    return { valid: false, error: 'Unit is required.' };
  }

  return {
    valid: true,
    data: {
      itemCode,
      itemName,
      itemType: itemType as ItemType,
      unit,
      description,
    },
  };
}

function getItemApiErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');

    if (code === 'P2002') {
      return { error: 'Item code already exists.' };
    }

    if (code === 'P2021') {
      return {
        error: 'Database schema is not initialized.',
        details: 'The items table is missing. Please redeploy so the schema sync can run.',
      };
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch failed')) {
      return {
        error: 'Database connection failed.',
        details: 'The application could not reach the database service.',
      };
    }

    if (
      error.message.includes('does not exist') ||
      error.message.includes('relation') ||
      error.message.includes('table')
    ) {
      return {
        error: 'Database schema is not initialized.',
        details: error.message,
      };
    }

    return {
      error: 'Failed to create item',
      details: error.message,
    };
  }

  return {
    error: 'Failed to create item',
    details: String(error),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');
    const itemType = searchParams.get('itemType');

    const where: Record<string, unknown> = {};
    if (itemCode) where.itemCode = { contains: itemCode };
    if (itemType) where.itemType = itemType;

    const items = await prisma.item.findMany({
      where,
      orderBy: { itemCode: 'asc' },
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = validateItemPayload(body);

    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const { itemCode, itemName, itemType, unit, description } =
      validationResult.data;

    const existingItem = await prisma.item.findUnique({
      where: { itemCode },
      select: { id: true },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Item code already exists.' },
        { status: 409 }
      );
    }

    const newItem = await prisma.item.create({
      data: {
        itemCode,
        itemName,
        itemType,
        unit,
        description,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: unknown) {
    const apiError = getItemApiErrorMessage(error);
    return NextResponse.json(
      apiError,
      { status: 500 }
    );
  }
}