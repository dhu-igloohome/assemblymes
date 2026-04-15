import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseSessionCookieValue, AUTH_COOKIE_NAME, SUPER_ADMIN_ROLE } from '@/lib/auth';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const session = await parseSessionCookieValue(sessionCookie?.value);

    if (!session || session.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { role, isActive, password } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (role) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    
    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'NO_DATA_TO_UPDATE' }, { status: 400 });
    }

    const updatedUser = await prisma.systemUser.update({
      where: { id },
      data: dataToUpdate,
      include: {
        employee: true,
      }
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'FAILED_TO_UPDATE_USER' }, { status: 500 });
  }
}
