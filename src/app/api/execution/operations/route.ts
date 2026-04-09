import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

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
