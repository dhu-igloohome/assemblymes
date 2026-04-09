import { compare } from 'bcryptjs';
import { prisma } from './prisma';

export const AUTH_COOKIE_NAME = 'assemblymes_session';
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;

// Environment variable for HMAC signing.
const AUTH_SECRET = process.env.AUTH_SECRET || 'assemblymes-default-secret-2026-04-09';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionUser {
  userId: string;
  username: string;
  role: string;
  employeeId?: string;
  employeeName?: string;
  exp: number;
}

/**
 * Edge-compatible HMAC-SHA256 signature using Web Crypto API
 */
async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(AUTH_SECRET);
  const data = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createSessionCookieValue(user: Omit<SessionUser, 'exp'>) {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const signature = await sign(data);
  return `${data}.${signature}`;
}

export async function parseSessionCookieValue(value: string | undefined): Promise<SessionUser | null> {
  if (!value || !value.includes('.')) {
    return null;
  }
  try {
    const [data, signature] = value.split('.');
    const expectedSignature = await sign(data);
    
    // Simple string comparison is fine here as we're comparing base64 signatures
    if (signature !== expectedSignature) {
      console.error('Session signature mismatch');
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as SessionUser;
    if (!payload?.username || !payload?.role || !payload?.exp || !payload?.userId) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error('Session parse error:', error);
    return null;
  }
}

export async function verifyUserCredentials(username: string, password: string): Promise<Omit<SessionUser, 'exp'> | null> {
  const user = await prisma.systemUser.findUnique({
    where: { username },
    include: { employee: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employee?.id,
    employeeName: user.employee?.name,
  };
}
