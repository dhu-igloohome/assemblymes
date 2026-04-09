'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  Cpu,
  Factory,
  FileText,
  GitBranchPlus,
  Package2,
  ShieldCheck,
  ShoppingCart,
  Coins,
  CalendarClock,
  Handshake,
  Users,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { usePathname, Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

const navModules = [
  {
    id: 'dashboard',
    titleKey: 'overview',
    icon: LayoutDashboard,
    children: [
      { href: '/dashboard', translationKey: 'overview', icon: BarChart3 },
    ],
  },
  {
    id: 'pie',
    titleKey: 'module_pie',
    icon: Boxes,
    children: [
      { href: '/pie', translationKey: 'overview', icon: LayoutDashboard },
      { href: '/pie/items', translationKey: 'items', icon: Package2 },
      { href: '/pie/boms', translationKey: 'boms', icon: GitBranchPlus },
      { href: '/pie/routings', translationKey: 'routings', icon: ClipboardList },
      { href: '/pie/work-centers', translationKey: 'work_centers', icon: Factory },
    ],
  },
  {
    id: 'execution',
    titleKey: 'module_execution',
    icon: Cpu,
    children: [
      { href: '/execution/work-orders', translationKey: 'work_orders', icon: FileText },
      { href: '/execution/report', translationKey: 'execution', icon: Cpu },
      { href: '/execution/andon', translationKey: 'andon_board', icon: BarChart3 },
    ],
  },
  {
    id: 'inventory',
    titleKey: 'module_inventory',
    icon: Package2,
    children: [{ href: '/inventory', translationKey: 'inventory_overview', icon: Package2 }],
  },
  {
    id: 'quality',
    titleKey: 'module_quality',
    icon: ShieldCheck,
    children: [{ href: '/quality', translationKey: 'quality_overview', icon: ShieldCheck }],
  },
  {
    id: 'procurement',
    titleKey: 'module_procurement',
    icon: ShoppingCart,
    children: [{ href: '/procurement', translationKey: 'procurement_overview', icon: ShoppingCart }],
  },
  {
    id: 'cost',
    titleKey: 'module_cost',
    icon: Coins,
    children: [{ href: '/cost', translationKey: 'cost_overview', icon: Coins }],
  },
  {
    id: 'planning',
    titleKey: 'module_planning',
    icon: CalendarClock,
    children: [{ href: '/planning', translationKey: 'planning_overview', icon: CalendarClock }],
  },
  {
    id: 'o2c',
    titleKey: 'module_o2c',
    icon: Handshake,
    children: [{ href: '/o2c', translationKey: 'o2c_overview', icon: Handshake }],
  },
  {
    id: 'org_access',
    titleKey: 'module_org_access',
    icon: Users,
    children: [
      { href: '/personnel/employees', translationKey: 'employees', icon: Users },
      { href: '/pie/system/users', translationKey: 'system_users', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    ],
  },
] as const;

interface SidebarProps {
  locale: string;
  currentUser: {
    username: string;
    role: string;
  } | null;
}

export default function Sidebar({ locale, currentUser }: SidebarProps) {
  const t = useTranslations('Pie');
  const pathname = usePathname();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navModules.map((module) => [module.id, true]))
  );
  const roleLabel = currentUser?.role || '—';

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    const activeModule = navModules.find((module) =>
      module.children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
    );
    if (!activeModule) return;
    setOpenModules((prev) => ({ ...prev, [activeModule.id]: true }));
  }, [pathname]);

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
        <h1 className="mt-2 text-xl font-semibold text-white">{t('module_title')}</h1>
        <p className="mt-1 text-sm text-slate-400">{t('module_description')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
        {navModules.map((module) => {
          if ('roles' in module && currentUser) {
            const allowedRoles = (module as any).roles as string[];
            if (!allowedRoles.includes(currentUser.role)) {
              return null;
            }
          }
          
          const ModuleIcon = module.icon;
          const isModuleActive = module.children.some(
            (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
          );
          const isOpen = Boolean(openModules[module.id]);
          return (
            <div key={module.id} className="rounded-lg border border-slate-800 bg-slate-900/70">
              <button
                type="button"
                onClick={() => setOpenModules((prev) => ({ ...prev, [module.id]: !isOpen }))}
                className={[
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isModuleActive
                    ? 'bg-indigo-500/15 font-medium text-indigo-200'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center gap-3">
                  <ModuleIcon className="size-4" />
                  <span>{t(module.titleKey)}</span>
                </span>
                <ChevronDown
                  className={['size-4 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
                />
              </button>

              <div className={['overflow-hidden transition-all duration-200', isOpen ? 'max-h-96' : 'max-h-0'].join(' ')}>
                <div className="space-y-1 px-2 pb-2">
                  {module.children.map((item) => {
                    if ('roles' in item && currentUser) {
                      const allowedRoles = (item as any).roles as string[];
                      if (!allowedRoles.includes(currentUser.role)) {
                        return null;
                      }
                    }
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          'ml-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
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
            </div>
          );
        })}
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
