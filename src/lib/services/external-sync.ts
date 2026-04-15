import { prisma } from '@/lib/prisma';
import { createAuditLog } from './audit-service';

export type SyncSystem = 'ERP' | 'FINANCE';

export async function simulateExternalSync(system: SyncSystem, entityType: string, entityId: string, operator: string) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  const success = Math.random() > 0.1; // 90% success rate simulation
  const timestamp = new Date();

  if (success) {
    await createAuditLog({
      action: `SYNC_TO_${system}`,
      entity: entityType,
      entityId: entityId,
      operator,
      details: { status: 'SUCCESS', targetSystem: system, syncTime: timestamp }
    });
    return { success: true, timestamp };
  } else {
    await createAuditLog({
      action: `SYNC_TO_${system}_FAILED`,
      entity: entityType,
      entityId: entityId,
      operator,
      details: { status: 'FAILED', error: 'Connection Timeout', targetSystem: system, syncTime: timestamp }
    });
    throw new Error(`${system} Connection Timeout`);
  }
}
