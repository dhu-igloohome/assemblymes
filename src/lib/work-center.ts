import type { WorkCenterType } from '@prisma/client';

export const WORK_CENTER_TYPE_OPTIONS: WorkCenterType[] = ['FLOW_LINE', 'STANDALONE'];

export function isWorkCenterType(value: string): value is WorkCenterType {
  return WORK_CENTER_TYPE_OPTIONS.includes(value as WorkCenterType);
}
