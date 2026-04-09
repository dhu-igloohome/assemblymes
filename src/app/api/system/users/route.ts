import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseSessionCookieValue, AUTH_COOKIE_NAME, SUPER_ADMIN_ROLE } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session || session.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const users = await prisma.systemUser.findMany({
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'FAILED_TO_FETCH_USERS' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session || session.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, role, employeeId, isActive } = body;

    if (!username || !password || !role || !employeeId) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const existingUser = await prisma.systemUser.findFirst({
      where: {
        OR: [
          { username },
          { employeeId }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'USER_OR_EMPLOYEE_ALREADY_BOUND' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.systemUser.create({
      data: {
        username,
        passwordHash,
        role,
        employeeId,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        employee: true,
      }
    });

    // Don't send password hash back
    const { passwordHash: _ph, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'FAILED_TO_CREATE_USER' }, { status: 500 });
  }
}
