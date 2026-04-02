export const AUTH_COOKIE_NAME = 'assemblymes_session';

export const SUPER_ADMIN_ROLE = 'super_admin' as const;

export const SUPER_ADMINS = [
  {
    username: 'david',
    password: 'david123',
    role: SUPER_ADMIN_ROLE,
  },
  {
    username: 'shu',
    password: 'shu123',
    role: SUPER_ADMIN_ROLE,
  },
] as const;

export interface SessionUser {
  username: string;
  role: string;
}

export function createSessionCookieValue(user: SessionUser) {
  return `${encodeURIComponent(user.username)}|${encodeURIComponent(user.role)}`;
}

export function parseSessionCookieValue(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }
  const [rawUsername, rawRole] = value.split('|');
  if (!rawUsername || !rawRole) {
    return null;
  }
  const username = decodeURIComponent(rawUsername);
  const role = decodeURIComponent(rawRole);
  if (!username || !role) {
    return null;
  }
  return { username, role };
}

export function isValidSuperAdmin(username: string, password: string) {
  return SUPER_ADMINS.some(
    (admin) => admin.username === username && admin.password === password
  );
}
