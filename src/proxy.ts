import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

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
    pathname.startsWith('/api/routings')
  );
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isLoggedIn = session === 'super_admin';

  if (pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  if (isProtectedApi(pathname) && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
