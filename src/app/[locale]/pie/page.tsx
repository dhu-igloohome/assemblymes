import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function PieHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';
  const t = await getTranslations('Pie');
  const modules = [
    { titleKey: 'items', descKey: 'items_description', href: '/pie/items' },
    { titleKey: 'boms', descKey: 'boms_description', href: '/pie/boms' },
    { titleKey: 'routings', descKey: 'routings_description', href: '/pie/routings' },
    { titleKey: 'work_centers', descKey: 'work_centers_description', href: '/pie/work-centers' },
    { titleKey: 'employees', descKey: 'employees_description', href: '/pie/employees' },
    { titleKey: 'execution', descKey: 'execution_description', href: '/pie/execution' },
    { titleKey: 'work_orders', descKey: 'work_orders_description', href: '/pie/work-orders' },
    { titleKey: 'inventory', descKey: 'inventory_description', href: '/pie/inventory' },
    { titleKey: 'quality', descKey: 'quality_description', href: '/pie/quality' },
    { titleKey: 'module_procurement', descKey: 'procurement_description', href: '/pie/procurement' },
    { titleKey: 'module_cost', descKey: 'cost_description', href: '/pie/cost' },
    { titleKey: 'module_planning', descKey: 'planning_description', href: '/pie/planning' },
    { titleKey: 'module_o2c', descKey: 'o2c_description', href: '/pie/o2c' },
  ] as const;

  return (
    <div className="p-8 md:p-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">
          {isZh ? t('module_title') : 'PIE Management'}
        </p>
        {isZh ? (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">PIE Management</p>
        ) : null}
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
          {t('welcome_title')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          {t('welcome_description')}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.titleKey}
              href={module.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                {t(module.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t(module.descKey)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
