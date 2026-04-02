// Local string-union types to avoid hard dependency on Prisma enum exports during builds.
// This prevents failures when Vercel uses a cached/stale generated Prisma client.
export type ItemType = 'PRODUCT' | 'ASSEMBLY' | 'MATERIAL';
export type ItemStatus = 'ENABLED' | 'DISABLED';
export type ItemSourceType = 'PURCHASED' | 'MANUFACTURED' | 'OUTSOURCED' | 'VIRTUAL';

export const UNIT_OPTIONS = ['PCS', 'KG', 'M'] as const;
export type ItemUnit = (typeof UNIT_OPTIONS)[number];

export const ITEM_GROUP_OPTIONS = ['ELECTRONIC', 'STRUCTURAL', 'PACKAGING', 'GENERAL'] as const;
export const ITEM_STATUS_OPTIONS: ItemStatus[] = ['ENABLED', 'DISABLED'];
export const ITEM_SOURCE_TYPE_OPTIONS: ItemSourceType[] = [
  'PURCHASED',
  'MANUFACTURED',
  'OUTSOURCED',
  'VIRTUAL',
];

export const ITEM_TYPE_PREFIX: Record<ItemType, string> = {
  PRODUCT: '10',
  ASSEMBLY: '20',
  MATERIAL: '30',
};

export const DEFAULT_UNIT_BY_TYPE: Record<ItemType, ItemUnit> = {
  PRODUCT: 'PCS',
  ASSEMBLY: 'PCS',
  MATERIAL: 'PCS',
};

export const ITEM_TYPE_OPTIONS: ItemType[] = ['PRODUCT', 'ASSEMBLY', 'MATERIAL'];

export function isItemType(value: string): value is ItemType {
  return ITEM_TYPE_OPTIONS.includes(value as ItemType);
}

export function isItemStatus(value: string): value is ItemStatus {
  return ITEM_STATUS_OPTIONS.includes(value as ItemStatus);
}

export function isItemSourceType(value: string): value is ItemSourceType {
  return ITEM_SOURCE_TYPE_OPTIONS.includes(value as ItemSourceType);
}

export function buildNextItemCode(prefix: string, latestCode?: string | null) {
  const latestNumber = latestCode ? Number(latestCode) : 0;
  const zeroPadding = '0'.repeat(Math.max(0, 6 - prefix.length));
  const baseNumber = Number(`${prefix}${zeroPadding}`);
  const nextNumber = Math.max(latestNumber + 1, baseNumber + 1);
  return String(nextNumber).padStart(6, '0');
}
