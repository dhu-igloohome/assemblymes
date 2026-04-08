export const AUTH_COOKIE_NAME = 'assemblymes_session';

export const SUPER_ADMIN_ROLE = 'super_admin' as const;

const SESSION_TTL_SECONDS = 60 * 60 * 12;

interface SuperAdminCredential {
  username: string;
  password: string;
}

export interface SessionUser {
  username: string;
  role: string;
  exp: number;
}

function getSuperAdmins(): SuperAdminCredential[] {
  const raw = process.env.SUPER_ADMINS_JSON ?? '[]';
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    const fromEnv = parsed
      .map((entry) => ({
        username: typeof entry.username === 'string' ? entry.username.trim() : '',
        password: typeof entry.password === 'string' ? entry.password : '',
      }))
      .filter((entry) => Boolean(entry.username && entry.password));
    if (fromEnv.length > 0) {
      return fromEnv;
    }
  } catch {
    // ignore parse error and fallback below
  }
  // Keep backward compatibility for existing deployments.
  return [
    { username: 'david', password: 'david123' },
    { username: 'shu', password: 'shu123' },
  ];
}

export function createSessionCookieValue(user: Pick<SessionUser, 'username' | 'role'>) {
  const payload = {
    username: user.username,
    role: user.role,
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
    if (!payload?.username || !payload?.role || !payload?.exp) {
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

export async function isValidSuperAdmin(username: string, password: string) {
  const admins = getSuperAdmins();
  const matched = admins.find((admin) => admin.username === username);
  if (!matched) return false;
  return matched.password === password;
}

