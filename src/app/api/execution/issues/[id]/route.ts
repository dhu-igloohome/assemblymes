import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { IssueStatus } from '@prisma/client';
import { cookies } from 'next/headers';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as any;
    const { status, resolution } = body;

    const currentIssue = await prisma.issueRecord.findUnique({
      where: { id }
    });

    if (!currentIssue) {
      return NextResponse.json({ error: 'ISSUE_NOT_FOUND' }, { status: 404 });
    }

    const operator = session.employeeName || session.username;
    const data: any = { status: status as IssueStatus };

    if (status === 'IN_PROGRESS' && !currentIssue.respondedAt) {
      data.respondedAt = new Date();
      data.responder = operator;
    }

    if (status === 'RESOLVED') {
      data.resolvedAt = new Date();
      data.resolution = resolution || null;
      if (!currentIssue.responder) data.responder = operator;
    }

    if (status === 'CLOSED') {
      // Allow closing directly
    }

    const updated = await prisma.issueRecord.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'FAILED_TO_UPDATE_ISSUE', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
