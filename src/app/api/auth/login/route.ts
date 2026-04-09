import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  createSessionCookieValue,
  verifyUserCredentials,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; firstAt: number; blockedUntil?: number }>();

function getClientKey(request: Request, username: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return `${ip}:${username.toLowerCase()}`;
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

function getUserAgent(request: Request) {
  return request.headers.get('user-agent')?.slice(0, 255) || null;
}

function isBlocked(key: string) {
  const now = Date.now();
  const record = attempts.get(key);
  return Boolean(record?.blockedUntil && record.blockedUntil > now);
}

function consumeFailedAttempt(key: string) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record) {
    attempts.set(key, { count: 1, firstAt: now });
    return false;
  }
  if (now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return false;
  }
  const nextCount = record.count + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    attempts.set(key, { count: nextCount, firstAt: record.firstAt, blockedUntil: now + BLOCK_MS });
    return true;
  }
  attempts.set(key, { count: nextCount, firstAt: record.firstAt });
  return false;
}

function clearAttempt(key: string) {
  attempts.delete(key);
}

async function auditLogin(
  request: Request,
  username: string,
  success: boolean,
  reasonCode?: string
) {
  try {
    await prisma.authLoginAudit.create({
      data: {
        username: username || 'unknown',
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
        success,
        reasonCode: reasonCode || null,
      },
    });
  } catch {
    // audit log should not block login flow
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const locale = body.locale === 'en' ? 'en' : 'zh';

    if (!username || !password) {
      await auditLogin(request, username, false, 'INVALID_CREDENTIALS');
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 400 }
      );
    }

    const key = getClientKey(request, username);
    const sessionUser = await verifyUserCredentials(username, password);
    const isValid = sessionUser !== null;
    
    if (isBlocked(key) && !isValid) {
      await auditLogin(request, username, false, 'LOGIN_RATE_LIMITED');
      const response = NextResponse.json({ error: 'LOGIN_RATE_LIMITED' }, { status: 429 });
      response.headers.set('Retry-After', String(Math.ceil(BLOCK_MS / 1000)));
      response.headers.set('X-RateLimit-Limit', String(MAX_ATTEMPTS));
      response.headers.set('X-RateLimit-Window', String(Math.ceil(WINDOW_MS / 1000)));
      return response;
    }

    if (!isValid) {
      const blocked = consumeFailedAttempt(key);
      if (blocked) {
        await auditLogin(request, username, false, 'LOGIN_RATE_LIMITED');
        const response = NextResponse.json({ error: 'LOGIN_RATE_LIMITED' }, { status: 429 });
        response.headers.set('Retry-After', String(Math.ceil(BLOCK_MS / 1000)));
        response.headers.set('X-RateLimit-Limit', String(MAX_ATTEMPTS));
        response.headers.set('X-RateLimit-Window', String(Math.ceil(WINDOW_MS / 1000)));
        return response;
      }
      await auditLogin(request, username, false, 'INVALID_CREDENTIALS');
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    clearAttempt(key);
    await auditLogin(request, username, true);

    const response = NextResponse.json({
      success: true,
      role: sessionUser.role,
      redirectTo: `/${locale}/pie`,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: createSessionCookieValue(sessionUser),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    await auditLogin(request, 'unknown', false, 'LOGIN_FAILED');
    return NextResponse.json(
      {
        error: 'LOGIN_FAILED',
      },
      { status: 500 }
    );
  }
}
