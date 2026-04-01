export const AUTH_COOKIE_NAME = 'assemblymes_session';

export const SUPER_ADMIN = {
  username: 'david',
  password: 'david123',
  role: 'super_admin',
} as const;

export function isValidSuperAdmin(username: string, password: string) {
  return (
    username === SUPER_ADMIN.username &&
    password === SUPER_ADMIN.password
  );
}
