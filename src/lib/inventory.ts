import { Prisma, type InventoryTxnType } from '@prisma/client';

export const INVENTORY_TXN_TYPES: InventoryTxnType[] = ['IN', 'OUT', 'TRANSFER', 'ADJUST'];

export function isInventoryTxnType(value: string): value is InventoryTxnType {
  return INVENTORY_TXN_TYPES.includes(value as InventoryTxnType);
}

export function parsePositiveDecimal(value: unknown): Prisma.Decimal | null {
  const raw = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Prisma.Decimal(n);
}

export function parseOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
