import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Get all operations for active work orders
    const activeOperations = await prisma.workOrderOperation.findMany({
      where: {
        workOrder: {
          status: {
            in: ['RELEASED', 'IN_PROGRESS']
          }
        }
      },
      include: {
        workOrder: {
          select: {
            workOrderNo: true,
            skuItemCode: true,
            batchNo: true,
            plannedQty: true,
          }
        }
      },
      orderBy: [
        { workOrder: { createdAt: 'desc' } },
        { sequence: 'asc' }
      ]
    });

    return NextResponse.json(activeOperations);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'FAILED_TO_LOAD_OPERATIONS', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
