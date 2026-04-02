'use client';

import { useTranslations } from 'next-intl';
import { Boxes, ClipboardList, Factory, GitBranchPlus, Package2, Users } from 'lucide-react';
import { usePathname, Link } from '@/i18n/routing';

const pieNavItems = [
  {
    href: '/pie',
    translationKey: 'overview',
    icon: Boxes,
  },
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

export default function PieSidebar() {
  const t = useTranslations('Pie');
  const pathname = usePathname();

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
        {pieNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/pie' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')}
            >
              <Icon className="size-4" />
              <span>{t(item.translationKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
