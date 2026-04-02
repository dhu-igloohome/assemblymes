import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  ITEM_GROUP_OPTIONS,
  ITEM_SOURCE_TYPE_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  type ItemSourceType,
  type ItemStatus,
  type ItemType,
} from '@/lib/item-master';

type ValidItemPayload = {
  itemCode: string;
  itemName: string;
  itemType: ItemType;
  unit: string;
  itemGroup: string;
  specification: string;
  status: ItemStatus;
  sourceType: ItemSourceType;
  isPurchasable: boolean;
  requiresFlashing: boolean;
  requiresTraceability: boolean;
  requiresDfu: boolean;
  safetyStock: Prisma.Decimal;
  imageUrl: string;
  description: string;
  remarks: string;
};

type ItemUsageSummary = {
  bomParentCount: number;
  bomComponentCount: number;
  routingCount: number;
  totalReferences: number;
  canDisable: boolean;
  canDelete: boolean;
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function parseBoolean(value: string | null) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

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
  const itemGroup = typeof payload.itemGroup === 'string' ? payload.itemGroup.trim() : '';
  const specification =
    typeof payload.specification === 'string' ? payload.specification.trim() : '';
  const status = typeof payload.status === 'string' ? payload.status.trim() : '';
  const sourceType =
    typeof payload.sourceType === 'string' ? payload.sourceType.trim() : '';
  const isPurchasable = payload.isPurchasable;
  const safetyStockValue = payload.safetyStock;
  const requiresFlashing = payload.requiresFlashing;
  const requiresTraceability = payload.requiresTraceability;
  const requiresDfu = payload.requiresDfu;
  const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const remarks = typeof payload.remarks === 'string' ? payload.remarks.trim() : '';

  if (!/^\d{6}$/.test(itemCode)) {
    return { valid: false, error: 'Item code must be exactly 6 digits.' };
  }

  if (!itemName) {
    return { valid: false, error: 'Item name is required.' };
  }

  if (!ITEM_TYPE_OPTIONS.includes(itemType as ItemType)) {
    return { valid: false, error: 'Item type is invalid.' };
  }

  if (!unit) {
    return { valid: false, error: 'Unit is required.' };
  }

  if (itemGroup && !ITEM_GROUP_OPTIONS.includes(itemGroup as (typeof ITEM_GROUP_OPTIONS)[number])) {
    return { valid: false, error: 'Item group is invalid.' };
  }

  if (status && !ITEM_STATUS_OPTIONS.includes(status as ItemStatus)) {
    return { valid: false, error: 'Item status is invalid.' };
  }

  if (sourceType && !ITEM_SOURCE_TYPE_OPTIONS.includes(sourceType as ItemSourceType)) {
    return { valid: false, error: 'Item source type is invalid.' };
  }

  if (!isBoolean(isPurchasable)) {
    return { valid: false, error: 'Purchasable flag is invalid.' };
  }
  if (!isBoolean(requiresFlashing)) {
    return { valid: false, error: 'Flashing policy is invalid.' };
  }
  if (!isBoolean(requiresTraceability)) {
    return { valid: false, error: 'Traceability policy is invalid.' };
  }
  if (!isBoolean(requiresDfu)) {
    return { valid: false, error: 'DFU policy is invalid.' };
  }

  const parsedSafetyStock =
    typeof safetyStockValue === 'number' || typeof safetyStockValue === 'string'
      ? Number(safetyStockValue)
      : Number.NaN;

  if (!Number.isFinite(parsedSafetyStock) || parsedSafetyStock < 0) {
    return { valid: false, error: 'Safety stock must be a non-negative number.' };
  }

  return {
    valid: true,
    data: {
      itemCode,
      itemName,
      itemType: itemType as ItemType,
      unit,
      itemGroup,
      specification,
      status: (status || 'ENABLED') as ItemStatus,
      sourceType: (sourceType || 'PURCHASED') as ItemSourceType,
      isPurchasable,
      requiresFlashing,
      requiresTraceability,
      requiresDfu,
      safetyStock: new Prisma.Decimal(parsedSafetyStock),
      imageUrl,
      description,
      remarks,
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

async function getItemUsageSummary(itemCode: string): Promise<ItemUsageSummary> {
  const [bomParentCount, bomComponentCount, routingCount] = await Promise.all([
    prisma.bomHeader.count({ where: { parentItemCode: itemCode } }),
    prisma.bomLine.count({ where: { componentItemCode: itemCode } }),
    prisma.routingHeader.count({ where: { itemCode } }),
  ]);

  const totalReferences = bomParentCount + bomComponentCount + routingCount;

  return {
    bomParentCount,
    bomComponentCount,
    routingCount,
    totalReferences,
    canDisable: totalReferences === 0,
    canDelete: totalReferences === 0,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword')?.trim();
    const itemType = searchParams.get('itemType');
    const status = searchParams.get('status');
    const sourceType = searchParams.get('sourceType');
    const itemGroup = searchParams.get('itemGroup');
    const isPurchasable = parseBoolean(searchParams.get('isPurchasable'));

    const where: Prisma.ItemWhereInput = {};

    if (keyword) {
      where.OR = [
        { itemCode: { contains: keyword, mode: 'insensitive' } },
        { itemName: { contains: keyword, mode: 'insensitive' } },
        { specification: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (itemType && ITEM_TYPE_OPTIONS.includes(itemType as ItemType)) {
      where.itemType = itemType as ItemType;
    }
    if (status && ITEM_STATUS_OPTIONS.includes(status as ItemStatus)) {
      where.status = status as ItemStatus;
    }
    if (sourceType && ITEM_SOURCE_TYPE_OPTIONS.includes(sourceType as ItemSourceType)) {
      where.sourceType = sourceType as ItemSourceType;
    }
    if (itemGroup && ITEM_GROUP_OPTIONS.includes(itemGroup as (typeof ITEM_GROUP_OPTIONS)[number])) {
      where.itemGroup = itemGroup;
    }
    if (typeof isPurchasable === 'boolean') {
      where.isPurchasable = isPurchasable;
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { itemCode: 'asc' },
    });

    const itemsWithUsage = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usage: await getItemUsageSummary(item.itemCode),
      }))
    );

    return NextResponse.json(itemsWithUsage);
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

    const {
      itemCode,
      itemName,
      itemType,
      unit,
      itemGroup,
      specification,
      status,
      sourceType,
      isPurchasable,
      requiresFlashing,
      requiresTraceability,
      requiresDfu,
      safetyStock,
      imageUrl,
      description,
      remarks,
    } =
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
        itemGroup: itemGroup || null,
        specification: specification || null,
        status,
        sourceType,
        isPurchasable,
        requiresFlashing,
        requiresTraceability,
        requiresDfu,
        safetyStock,
        imageUrl: imageUrl || null,
        description,
        remarks: remarks || null,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validationResult = validateItemPayload(body);

    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const {
      itemCode,
      itemName,
      itemType,
      unit,
      itemGroup,
      specification,
      status,
      sourceType,
      isPurchasable,
      requiresFlashing,
      requiresTraceability,
      requiresDfu,
      safetyStock,
      imageUrl,
      description,
      remarks,
    } = validationResult.data;

    const existingItem = await prisma.item.findUnique({
      where: { itemCode },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    if (status === 'DISABLED') {
      const usage = await getItemUsageSummary(itemCode);
      if (!usage.canDisable) {
        return NextResponse.json(
          {
            error: 'Item cannot be disabled.',
            details: 'This item is already referenced by BOM or Routing records.',
            usage,
          },
          { status: 409 }
        );
      }
    }

    const updatedItem = await prisma.item.update({
      where: { itemCode },
      data: {
        itemName,
        itemType,
        unit,
        itemGroup: itemGroup || null,
        specification: specification || null,
        status,
        sourceType,
        isPurchasable,
        requiresFlashing,
        requiresTraceability,
        requiresDfu,
        safetyStock,
        imageUrl: imageUrl || null,
        description,
        remarks: remarks || null,
      },
    });

    return NextResponse.json({
      ...updatedItem,
      usage: await getItemUsageSummary(itemCode),
    });
  } catch (error: unknown) {
    const apiError = getItemApiErrorMessage(error);
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode')?.trim() ?? '';

    if (!/^\d{6}$/.test(itemCode)) {
      return NextResponse.json(
        { error: 'Item code must be exactly 6 digits.' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.item.findUnique({
      where: { itemCode },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const usage = await getItemUsageSummary(itemCode);
    if (!usage.canDelete) {
      return NextResponse.json(
        {
          error: 'Item cannot be deleted.',
          details: 'This item is already referenced by BOM or Routing records.',
          usage,
        },
        { status: 409 }
      );
    }

    await prisma.item.delete({
      where: { itemCode },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const apiError = getItemApiErrorMessage(error);
    return NextResponse.json(apiError, { status: 500 });
  }
}