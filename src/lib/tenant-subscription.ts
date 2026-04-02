import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRIAL_DAYS = 365;

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  return parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function getCurrentTenantSubscription() {
  const session = await getCurrentSessionUser();
  if (!session) {
    return null;
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { username: session.username },
    include: {
      tenant: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!membership?.tenant.subscription) {
    return null;
  }

  const now = new Date();
  const expiresAt = membership.tenant.subscription.expiresAt;
  const isExpired = expiresAt.getTime() < now.getTime();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / ONE_DAY_MS));

  return {
    tenantId: membership.tenantId,
    tenantCode: membership.tenant.tenantCode,
    tenantName: membership.tenant.name,
    username: session.username,
    expiresAt: expiresAt.toISOString(),
    daysLeft,
    readOnly: isExpired,
    status: isExpired ? 'EXPIRED' : membership.tenant.subscription.status,
  } as const;
}

export async function ensureTenantForUser(username: string, tenantName?: string) {
  const existing = await prisma.tenantMembership.findFirst({
    where: { username },
    include: { tenant: { include: { subscription: true } } },
  });
  if (existing?.tenant.subscription) {
    return existing.tenant;
  }

  const safeCode = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12) || 'TENANT';
  const tenantCode = `${safeCode}${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_TRIAL_DAYS * ONE_DAY_MS);

  const created = await prisma.tenant.create({
    data: {
      tenantCode,
      name: tenantName?.trim() || `${username} Factory`,
      createdBy: username,
      memberships: {
        create: {
          username,
          role: 'owner',
        },
      },
      subscription: {
        create: {
          startsAt: now,
          expiresAt,
          status: 'ACTIVE',
          trialDays: DEFAULT_TRIAL_DAYS,
        },
      },
    },
  });

  return created;
}

