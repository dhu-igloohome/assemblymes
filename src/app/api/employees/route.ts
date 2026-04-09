import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.employee.findMany({
      orderBy: [{ team: 'asc' }, { employeeNo: 'asc' }],
    });
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'EMPLOYEE_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const employeeNo =
      typeof body.employeeNo === 'string' ? body.employeeNo.trim().toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const team = typeof body.team === 'string' ? body.team.trim() : '';
    const skillMatrix =
      typeof body.skillMatrix === 'string' ? body.skillMatrix.trim() : '';
    const skills = Array.isArray(body.skills) ? body.skills : [];

    if (!/^[A-Z0-9_-]{1,32}$/.test(employeeNo)) {
      return NextResponse.json({ error: 'EMPLOYEE_NO_INVALID' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'EMPLOYEE_NAME_REQUIRED' }, { status: 400 });
    }
    if (!team) {
      return NextResponse.json({ error: 'EMPLOYEE_TEAM_REQUIRED' }, { status: 400 });
    }

    const created = await prisma.employee.create({
      data: {
        employeeNo,
        name,
        team,
        skills,
        skillMatrix: skillMatrix || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'EMPLOYEE_NO_DUPLICATE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'EMPLOYEE_CREATE_FAILED' }, { status: 400 });
  }
}

