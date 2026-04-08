'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Boxes,
  ClipboardList,
  Cpu,
  Factory,
  FileText,
  GitBranchPlus,
  Package2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { usePathname, Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

const masterDataNavItems = [
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
] as const;

const executionNavItems = [
  {
    href: '/pie/execution',
    translationKey: 'execution',
    icon: Cpu,
  },
  {
    href: '/pie/work-orders',
    translationKey: 'work_orders',
    icon: FileText,
  },
] as const;

const supplyQualityNavItems = [
  {
    href: '/pie/inventory',
    translationKey: 'inventory',
    icon: Package2,
  },
  {
    href: '/pie/quality',
    translationKey: 'quality',
    icon: ShieldCheck,
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const roleLabel =
    currentUser?.role === 'super_admin' ? t('role_super_admin') : currentUser?.role || '—';

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
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          AssemblyMES
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">
          {t('module_title')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{t('module_description')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">
          <Link
            href="/pie"
            className={[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === '/pie'
                ? 'bg-indigo-500/20 font-medium text-indigo-100'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            ].join(' ')}
          >
            <Boxes className="size-4" />
            <span>{t('overview')}</span>
          </Link>

          <div className="mt-3 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {t('section_master_data')}
          </div>
          <div className="mt-1 space-y-1">
            {masterDataNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-500/20 font-medium text-indigo-100'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                  <span>{t(item.translationKey)}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {t('section_execution')}
          </div>
          <div className="mt-1 space-y-1">
            {executionNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-500/20 font-medium text-indigo-100'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                  <span>{t(item.translationKey)}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {t('section_supply_quality')}
          </div>
          <div className="mt-1 space-y-1">
            {supplyQualityNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-500/20 font-medium text-indigo-100'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                  <span>{t(item.translationKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">{t('current_user')}</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {currentUser?.username || '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t('role_label')}: {roleLabel}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
          >
            {isSigningOut ? t('signing_out') : t('sign_out')}
          </Button>
          {signOutError ? (
            <p className="mt-2 text-xs text-red-400">{signOutError}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
