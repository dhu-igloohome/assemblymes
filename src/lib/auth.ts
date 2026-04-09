import { compare } from 'bcryptjs';
import { prisma } from './prisma';

export const AUTH_COOKIE_NAME = 'assemblymes_session';

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionUser {
  userId: string;
  username: string;
  role: string;
  employeeId?: string;
  employeeName?: string;
  exp: number;
}

export function createSessionCookieValue(user: Omit<SessionUser, 'exp'>) {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function parseSessionCookieValue(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as SessionUser;
    if (!payload?.username || !payload?.role || !payload?.exp || !payload?.userId) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
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

