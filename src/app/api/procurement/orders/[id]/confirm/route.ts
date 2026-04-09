import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'PLANNER') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    
    const confirmedBy = session.employeeName || session.username;

    const po = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
    if (!po) return NextResponse.json({ error: 'PURCHASE_ORDER_NOT_FOUND' }, { status: 404 });
    if (po.status !== 'DRAFT') return NextResponse.json({ error: 'PO_STATUS_INVALID' }, { status: 400 });

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: confirmedBy,
      },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'PURCHASE_ORDER_CONFIRM_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
