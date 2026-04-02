'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  Cpu,
  Factory,
  GitBranchPlus,
  Package2,
  Users,
} from 'lucide-react';
import { usePathname, Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

const pieChildNavItems = [
  {
    href: '/pie/items',
    translationKey: 'items',
    icon: Package2,
  },
  {
    href: '/pie/boms',
    translationKey: 'boms',
    icon: GitBranchPlus,
  },
  {
    href: '/pie/routings',
    translationKey: 'routings',
    icon: ClipboardList,
  },
  {
    href: '/pie/work-centers',
    translationKey: 'work_centers',
    icon: Factory,
  },
  {
    href: '/pie/employees',
    translationKey: 'employees',
    icon: Users,
  },
  {
    href: '/pie/execution',
    translationKey: 'execution',
    icon: Cpu,
  },
] as const;

interface PieSidebarProps {
  locale: string;
  currentUser: {
    username: string;
    role: string;
  } | null;
}

export default function PieSidebar({ locale, currentUser }: PieSidebarProps) {
  const t = useTranslations('Pie');
  const pathname = usePathname();
  const isPieActive = pathname === '/pie' || pathname.startsWith('/pie/');
  const roleLabel =
    currentUser?.role === 'super_admin' ? t('role_super_admin') : currentUser?.role || '—';

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOut = async () => {
    setSignOutError('');
    setIsSigningOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        setSignOutError(t('sign_out_failed'));
        return;
      }
      window.location.assign(`/${locale}`);
    } catch {
      setSignOutError(t('sign_out_failed'));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-white">
      <div className="border-b px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
          AssemblyMES
        </p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">
          {t('module_title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('module_description')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
        <div className="group rounded-lg border border-gray-100 bg-gray-50/60">
          <Link
            href="/pie"
            className={[
              'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
              isPieActive
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')}
          >
            <span className="flex items-center gap-3">
              <Boxes className="size-4" />
              <span>{t('module_title')}</span>
            </span>
            <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
          </Link>

          <div className="max-h-0 overflow-hidden transition-all duration-200 group-hover:max-h-96">
            <div className="space-y-1 px-2 pb-2">
              {pieChildNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'ml-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-blue-100 font-medium text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    ].join(' ')}
                  >
                    <Icon className="size-4" />
                    <span>{t(item.translationKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <div className="border-t px-3 py-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">{t('current_user')}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {currentUser?.username || '—'}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {t('role_label')}: {roleLabel}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
          >
            {isSigningOut ? t('signing_out') : t('sign_out')}
          </Button>
          {signOutError ? (
            <p className="mt-2 text-xs text-red-600">{signOutError}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
