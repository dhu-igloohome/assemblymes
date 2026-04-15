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
  MessageSquare,
} from 'lucide-react';
import { usePathname, Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

const navModules = [
  {
    id: 'dashboard',
    titleKey: 'control_center',
    icon: LayoutDashboard,
    children: [
      { href: '/dashboard', translationKey: 'control_center', icon: BarChart3 },
    ],
  },
  {
    id: 'engineering',
    titleKey: 'engineering',
    icon: Boxes,
    roles: ['SUPER_ADMIN', 'ENGINEER'],
    children: [
      { href: '/pie/items', translationKey: 'title', icon: Package2, ns: 'Items' },
      { href: '/pie/boms', translationKey: 'title', icon: GitBranchPlus, ns: 'Boms' },
      { href: '/pie/routings', translationKey: 'title', icon: ClipboardList, ns: 'Routings' },
      { href: '/pie/work-centers', translationKey: 'title', icon: Factory, ns: 'WorkCenters' },
    ],
  },
  {
    id: 'planning_sales',
    titleKey: 'orders_planning',
    icon: CalendarClock,
    roles: ['SUPER_ADMIN', 'PLANNER'],
    children: [
      { href: '/o2c', translationKey: 'title', icon: Handshake, ns: 'O2c' },
      { href: '/planning', translationKey: 'title', icon: CalendarClock, ns: 'Planning' },
    ],
  },
  {
    id: 'supply_inventory',
    titleKey: 'supply_inventory',
    icon: ShoppingCart,
    roles: ['SUPER_ADMIN', 'INVENTORY', 'PLANNER'],
    children: [
      { href: '/procurement', translationKey: 'procurement_overview', icon: ShoppingCart, ns: 'Procurement' },
      { href: '/inventory', translationKey: 'inventory_overview', icon: Package2, ns: 'Inventory' },
    ],
  },
  {
    id: 'manufacturing',
    titleKey: 'manufacturing',
    icon: Cpu,
    roles: ['SUPER_ADMIN', 'PRODUCTION', 'QUALITY', 'PLANNER'],
    children: [
      { href: '/execution/work-orders', translationKey: 'work_orders', icon: FileText, ns: 'WorkOrders' },
      { href: '/execution/report', translationKey: 'execution', icon: Cpu, roles: ['SUPER_ADMIN', 'PRODUCTION'], ns: 'Execution' },
      { href: '/quality', translationKey: 'quality_overview', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'QUALITY'], ns: 'Quality' },
      { href: '/execution/andon', translationKey: 'andon_board', icon: BarChart3, ns: 'Execution' },
    ],
  },
  {
    id: 'costing',
    titleKey: 'costing',
    icon: Coins,
    roles: ['SUPER_ADMIN', 'FINANCE'],
    children: [{ href: '/cost', translationKey: 'title', icon: Coins, ns: 'Cost' }],
  },
  {
    id: 'org_access',
    titleKey: 'organization',
    icon: Users,
    roles: ['SUPER_ADMIN'],
    children: [
      { href: '/personnel/employees', translationKey: 'title', icon: Users, ns: 'Employees' },
      { href: '/pie/system/users', translationKey: 'system_users', icon: ShieldCheck, roles: ['SUPER_ADMIN'], ns: 'System' },
      { href: '/pie/system/feedback', translationKey: 'visitor_feedback', icon: MessageSquare, roles: ['SUPER_ADMIN'], ns: 'System' },
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
  const t = useTranslations('Sidebar');
  const tPie = useTranslations('Pie');
  const tItems = useTranslations('Items');
  const tBoms = useTranslations('Boms');
  const tRoutings = useTranslations('Routings');
  const tWC = useTranslations('WorkCenters');
  const tO2c = useTranslations('O2c');
  const tPlanning = useTranslations('Planning');
  const tProc = useTranslations('Procurement');
  const tInv = useTranslations('Inventory');
  const tWO = useTranslations('WorkOrders');
  const tExec = useTranslations('Execution');
  const tQual = useTranslations('Quality');
  const tCost = useTranslations('Cost');
  const tEmp = useTranslations('Employees');
  const tSys = useTranslations('System');

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
        setSignOutError(tPie('sign_out_failed'));
        return;
      }
      window.location.assign(`/${locale}`);
    } catch {
      setSignOutError(tPie('sign_out_failed'));
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
        <h1 className="mt-2 text-xl font-semibold text-white">{tPie('module_title')}</h1>
        <p className="mt-1 text-sm text-slate-400">{tPie('module_description')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
        {navModules.map((module) => {
          if ('roles' in module && currentUser) {
          const allowedRoles = (module as any).roles as string[];
          if (currentUser && !allowedRoles.includes(currentUser.role)) {
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
                <ModuleIcon className="size-[17px]" />
                <span>{t.has(module.titleKey) ? t(module.titleKey) : module.titleKey}</span>
              </span>
              <ChevronDown
                className={['size-4 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
              />
            </button>

            <div className={['overflow-hidden transition-all duration-200', isOpen ? 'max-h-[500px]' : 'max-h-0'].join(' ')}>
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
                        <span>
                          {(() => {
                            const ns = (item as any).ns;
                            if (ns === 'Items') return tItems(item.translationKey);
                            if (ns === 'Boms') return tBoms(item.translationKey);
                            if (ns === 'Routings') return tRoutings(item.translationKey);
                            if (ns === 'WorkCenters') return tWC(item.translationKey);
                            if (ns === 'O2c') return tO2c(item.translationKey);
                            if (ns === 'Planning') return tPlanning(item.translationKey);
                            if (ns === 'Procurement') return tProc(item.translationKey);
                            if (ns === 'Inventory') return tInv(item.translationKey);
                            if (ns === 'WorkOrders') return tWO(item.translationKey);
                            if (ns === 'Execution') return tExec(item.translationKey);
                            if (ns === 'Quality') return tQual(item.translationKey);
                            if (ns === 'Cost') return tCost(item.translationKey);
                            if (ns === 'Employees') return tEmp(item.translationKey);
                            if (ns === 'System') return tSys(item.translationKey);
                            return t(item.translationKey);
                          })()}
                        </span>
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
          <p className="text-xs font-medium text-slate-400">{tPie('current_user')}</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {currentUser?.username || '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {tPie('role_label')}: {roleLabel}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
          >
            {isSigningOut ? tPie('signing_out') : tPie('sign_out')}
          </Button>
          {signOutError ? (
            <p className="mt-2 text-xs text-red-400">{signOutError}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
