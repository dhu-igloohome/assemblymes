import PieSidebar from '@/components/PieSidebar';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';

export default async function PieLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PieSidebar
        locale={locale}
        currentUser={session}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
