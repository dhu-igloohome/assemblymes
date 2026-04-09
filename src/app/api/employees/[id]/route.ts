import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const team = typeof body.team === 'string' ? body.team.trim() : undefined;
    const skillMatrix =
      typeof body.skillMatrix === 'string' ? body.skillMatrix.trim() : undefined;
    const skills = Array.isArray(body.skills) ? body.skills : undefined;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'EMPLOYEE_NOT_FOUND' }, { status: 404 });
    }

    const data: { name?: string; team?: string; skills?: string[]; skillMatrix?: string | null } = {};

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: 'EMPLOYEE_NAME_REQUIRED' }, { status: 400 });
      }
      data.name = name;
    }

    if (team !== undefined) {
      if (!team) {
        return NextResponse.json({ error: 'EMPLOYEE_TEAM_REQUIRED' }, { status: 400 });
      }
      data.team = team;
    }

    if (skillMatrix !== undefined) {
      data.skillMatrix = skillMatrix || null;
    }

    if (skills !== undefined) {
      data.skills = skills;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.employee.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'EMPLOYEE_UPDATE_FAILED' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'EMPLOYEE_NOT_FOUND' }, { status: 404 });
    }

    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'EMPLOYEE_DELETE_FAILED' }, { status: 400 });
  }
}

