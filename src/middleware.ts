import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { AUTH_COOKIE_NAME, SUPER_ADMIN_ROLE, parseSessionCookieValue } from '@/lib/auth';

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPath(pathname: string) {
  const [, locale] = pathname.split('/');
  if (locale === 'zh' || locale === 'en') {
    return locale;
  }

  return routing.defaultLocale;
}

function isProtectedPage(pathname: string) {
  // Protect all internal modules
  return /^\/(zh|en)\/(pie|execution|personnel)/.test(pathname);
}

function isPublicApi(pathname: string) {
  // Allow login, logout and visitor feedback
  return pathname.startsWith('/api/auth/login') || 
         pathname.startsWith('/api/auth/logout') ||
         pathname.startsWith('/api/feedback');
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await parseSessionCookieValue(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isLoggedIn = !!session;

  // 1. API Protection Logic
  if (pathname.startsWith('/api/')) {
    // Check system admin routes first
    if (pathname.startsWith('/api/system') && session?.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ error: 'Forbidden: Requires Super Admin' }, { status: 403 });
    }

    // Protect all APIs except public ones
    if (!isPublicApi(pathname) && !isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.next();
  }

  // 2. Page Protection Logic
  if (isProtectedPage(pathname)) {
    if (!isLoggedIn) {
      const locale = getLocaleFromPath(pathname);
      const loginUrl = new URL(`/${locale}`, request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // RBAC for sensitive pages
    if (pathname.includes('/system/') && session?.role !== SUPER_ADMIN_ROLE) {
      const locale = getLocaleFromPath(pathname);
      return NextResponse.redirect(new URL(`/${locale}/pie`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/api/:path*'],
};
