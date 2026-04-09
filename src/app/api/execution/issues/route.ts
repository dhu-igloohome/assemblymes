import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { IssueStatus, IssueType } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    let whereClause: any = {};
    if (statusParam) {
      if (statusParam.includes(',')) {
        whereClause.status = { in: statusParam.split(',') as IssueStatus[] };
      } else {
        whereClause.status = statusParam as IssueStatus;
      }
    }

    const issues = await prisma.issueRecord.findMany({
      where: whereClause,
      include: {
        workOrder: {
          select: {
            workOrderNo: true,
            skuItemCode: true,
          }
        },
        operation: {
          select: {
            operationName: true,
            sequence: true,
          }
        }
      },
      orderBy: { reportedAt: 'desc' }
    });

    return NextResponse.json(issues);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'FAILED_TO_LOAD_ISSUES', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = (await request.json()) as any;
    const { issueType, description, workOrderId, operationId, workCenterCode } = body;

    if (!issueType || !description) {
      return NextResponse.json({ error: 'TYPE_AND_DESC_REQUIRED' }, { status: 400 });
    }

    const reporter = session.employeeName || session.username;

    const issue = await prisma.issueRecord.create({
      data: {
        issueType: issueType as IssueType,
        description,
        workOrderId: workOrderId || null,
        operationId: operationId || null,
        workCenterCode: workCenterCode || null,
        reporter,
        status: 'OPEN',
      }
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'FAILED_TO_REPORT_ISSUE', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
