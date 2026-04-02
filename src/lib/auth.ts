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

export function isValidSuperAdmin(username: string, password: string) {
  return SUPER_ADMINS.some(
    (admin) => admin.username === username && admin.password === password
  );
}
