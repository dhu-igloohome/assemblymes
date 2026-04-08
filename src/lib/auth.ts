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

function toBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(base64: string) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const bytes = fromBase64(`${normalized}${pad}`);
  return new TextDecoder().decode(bytes);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function sign(value: string) {
  const secret = process.env.AUTH_SECRET ?? '';
  if (!secret) {
    return '';
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64(new Uint8Array(signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getSuperAdmins(): SuperAdminCredential[] {
  const raw = process.env.SUPER_ADMINS_JSON ?? '[]';
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed
      .map((entry) => ({
        username: typeof entry.username === 'string' ? entry.username.trim() : '',
        password: typeof entry.password === 'string' ? entry.password : '',
      }))
      .filter((entry) => Boolean(entry.username && entry.password));
  } catch {
    return [];
  }
}

export async function createSessionCookieValue(user: Pick<SessionUser, 'username' | 'role'>) {
  const payload = {
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encoded);
  if (!signature) {
    throw new Error('AUTH_SECRET is required.');
  }
  return `${encoded}.${signature}`;
}

export async function parseSessionCookieValue(value: string | undefined): Promise<SessionUser | null> {
  if (!value) {
    return null;
  }
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) {
    return null;
  }
  const expected = await sign(encoded);
  if (!expected || !safeEqual(expected, signature)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionUser;
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

export function isValidSuperAdmin(username: string, password: string) {
  const admins = getSuperAdmins();
  return admins.some(
    (admin) => admin.username === username && admin.password === password
  );
}

