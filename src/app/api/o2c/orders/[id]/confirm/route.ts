import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { runAutoPlanForSalesOrder } from '@/lib/services/sales-order-automation';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const session = await parseSessionCookieValue(sessionCookie?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'FINANCE') {
      return NextResponse.json({ error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const confirmedBy = session.employeeName || session.username;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'SALES_ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'SO_STATUS_INVALID' }, { status: 400 });
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: confirmedBy,
      },
    });
    const autoPlan = await runAutoPlanForSalesOrder(id, confirmedBy);
    return NextResponse.json({ ...updated, autoPlan });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'SO_CONFIRM_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
