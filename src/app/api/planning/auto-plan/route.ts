import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runAutoPlanForSalesOrder } from '@/lib/services/sales-order-automation';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/services/audit-service';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds)) {
      return NextResponse.json({ error: 'INVALID_ORDER_IDS' }, { status: 400 });
    }

    const results = [];
    for (const id of orderIds) {
      try {
        const res = await runAutoPlanForSalesOrder(id, session.username);
        
        // Audit log for each order converted
        await createAuditLog({
          action: 'AUTO_PLAN_ORDER',
          entity: 'SalesOrder',
          entityId: id,
          operator: session.username,
          details: { ...res }
        });

        results.push({ orderId: id, success: true, ...res });
      } catch (err: any) {
        results.push({ orderId: id, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      processedCount: orderIds.length,
      results
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'AUTO_PLAN_FAILED', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
