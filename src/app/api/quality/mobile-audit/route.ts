import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { area, checks, triggeredIssue } = await request.json();

    // 1. Record the Audit Session in AuditLog for traceability
    await prisma.auditLog.create({
      data: {
        action: 'MOBILE_AUDIT_SUBMIT',
        entity: 'QUALITY_AUDIT',
        entityId: `AUDIT-${Date.now()}`,
        operator: session.username,
        details: JSON.stringify({ area, checks })
      }
    });

    // 2. If an issue was identified during audit, trigger a real Andon Issue
    if (triggeredIssue) {
      await prisma.issueRecord.create({
        data: {
          issueType: triggeredIssue.type || 'OTHER',
          status: 'OPEN',
          description: `[Mobile Audit @ ${area}] ${triggeredIssue.description}`,
          workCenterCode: area,
          reporter: session.username,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit submission failed:', error);
    return NextResponse.json({ error: 'AUDIT_FAILED' }, { status: 500 });
  }
}
