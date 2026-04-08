import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  SUPER_ADMIN_ROLE,
  createSessionCookieValue,
  isValidSuperAdmin,
} from '@/lib/auth';

const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; firstAt: number; blockedUntil?: number }>();

function getClientKey(request: Request, username: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return `${ip}:${username.toLowerCase()}`;
}

function consumeAttempt(key: string) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record) {
    attempts.set(key, { count: 1, firstAt: now });
    return { blocked: false };
  }
  if (record.blockedUntil && record.blockedUntil > now) {
    return { blocked: true };
  }
  if (now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return { blocked: false };
  }
  const nextCount = record.count + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    attempts.set(key, { count: nextCount, firstAt: record.firstAt, blockedUntil: now + BLOCK_MS });
    return { blocked: true };
  }
  attempts.set(key, { count: nextCount, firstAt: record.firstAt });
  return { blocked: false };
}

function clearAttempt(key: string) {
  attempts.delete(key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const locale = body.locale === 'en' ? 'en' : 'zh';

    if (!username || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 400 }
      );
    }

    const key = getClientKey(request, username);
    const status = consumeAttempt(key);
    if (status.blocked) {
      return NextResponse.json({ error: 'LOGIN_RATE_LIMITED' }, { status: 429 });
    }

    if (!isValidSuperAdmin(username, password)) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    clearAttempt(key);

    const response = NextResponse.json({
      success: true,
      role: SUPER_ADMIN_ROLE,
      redirectTo: `/${locale}/pie`,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: await createSessionCookieValue({ username, role: SUPER_ADMIN_ROLE }),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: 'LOGIN_FAILED',
      },
      { status: 500 }
    );
  }
}
