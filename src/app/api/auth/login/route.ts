import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, SUPER_ADMIN, isValidSuperAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const locale = body.locale === 'en' ? 'en' : 'zh';

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    if (!isValidSuperAdmin(username, password)) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: SUPER_ADMIN.role,
      redirectTo: `/${locale}/pie`,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: SUPER_ADMIN.role,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to sign in.',
      },
      { status: 500 }
    );
  }
}
