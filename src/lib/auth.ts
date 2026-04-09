import { compare } from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';

export const AUTH_COOKIE_NAME = 'assemblymes_session';
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;

// Environment variable for HMAC signing. Default is for development only.
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

function sign(payload: string): string {
  // Use a simple but consistent signing for both Node and Edge if createHmac is tricky,
  // but actually Next.js 15 supports most crypto APIs. 
  // Let's ensure length check for timingSafeEqual.
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('base64');
}

export function createSessionCookieValue(user: Omit<SessionUser, 'exp'>) {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const signature = sign(data);
  return `${data}.${signature}`;
}

export function parseSessionCookieValue(value: string | undefined): SessionUser | null {
  if (!value || !value.includes('.')) {
    return null;
  }
  try {
    const [data, signature] = value.split('.');
    const expectedSignature = sign(data);
    
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return null;
    }

    // Timing safe comparison
    const isValid = timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

    if (!isValid) {
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
    employeeId: user.employee.id,
    employeeName: user.employee.name,
  };
}
