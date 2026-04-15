import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    // Strict RBAC: Only Super Admins can see audit logs
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count()
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'AUDIT_LOG_LOAD_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
