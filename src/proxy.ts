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
  return pathname.startsWith('/zh/pie') || pathname.startsWith('/en/pie');
}

function isProtectedApi(pathname: string) {
  return (
    pathname.startsWith('/api/items') ||
    pathname.startsWith('/api/boms') ||
    pathname.startsWith('/api/routings') ||
    pathname.startsWith('/api/work-centers') ||
    pathname.startsWith('/api/employees') ||
    pathname.startsWith('/api/assembly-execution') ||
    pathname.startsWith('/api/traceability') ||
    pathname.startsWith('/api/work-orders') ||
    pathname.startsWith('/api/subscription') ||
    pathname.startsWith('/api/tenant')
  );
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSessionCookieValue(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isLoggedIn = session?.role === SUPER_ADMIN_ROLE;

  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next();
  }

  if (isProtectedApi(pathname) && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isProtectedPage(pathname) && !isLoggedIn) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = new URL(`/${locale}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/api/:path*'],
};
