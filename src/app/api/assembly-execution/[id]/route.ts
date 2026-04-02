import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ExecutionStatus } from '@prisma/client';

type ActionType = 'START' | 'COMPLETE' | 'FAIL';

function isAction(value: string): value is ActionType {
  return value === 'START' || value === 'COMPLETE' || value === 'FAIL';
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? '');
    const failReason = typeof body.failReason === 'string' ? body.failReason.trim() : '';
    const assignee = typeof body.assignee === 'string' ? body.assignee.trim() : '';

    if (!isAction(action)) {
      return NextResponse.json({ error: 'ACTION_INVALID' }, { status: 400 });
    }

    const existing = await prisma.assemblyExecutionTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'TASK_NOT_FOUND' }, { status: 404 });
    }

    let status: ExecutionStatus = existing.status;
    let startedAt = existing.startedAt;
    let finishedAt = existing.finishedAt;
    let nextFailReason: string | null = existing.failReason;

    if (action === 'START') {
      if (existing.status === 'DONE') {
        return NextResponse.json({ error: 'TASK_ALREADY_DONE' }, { status: 409 });
      }
      status = 'IN_PROGRESS';
      startedAt = existing.startedAt ?? new Date();
      nextFailReason = null;
      finishedAt = null;
    }

    if (action === 'COMPLETE') {
      if (existing.status !== 'IN_PROGRESS') {
        return NextResponse.json({ error: 'TASK_NOT_IN_PROGRESS' }, { status: 409 });
      }
      status = 'DONE';
      finishedAt = new Date();
      nextFailReason = null;
    }

    if (action === 'FAIL') {
      if (!failReason) {
        return NextResponse.json({ error: 'FAIL_REASON_REQUIRED' }, { status: 400 });
      }
      status = 'BLOCKED';
      nextFailReason = failReason;
      finishedAt = null;
    }

    const updated = await prisma.assemblyExecutionTask.update({
      where: { id },
      data: {
        status,
        startedAt,
        finishedAt,
        failReason: nextFailReason,
        assignee: assignee || existing.assignee,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'TASK_UPDATE_FAILED' }, { status: 400 });
  }
}

