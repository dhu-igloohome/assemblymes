import { prisma } from '@/lib/prisma';

export async function createAuditLog({
  action,
  entity,
  entityId,
  operator,
  details
}: {
  action: string;
  entity: string;
  entityId: string;
  operator: string;
  details?: any;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        operator,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}
