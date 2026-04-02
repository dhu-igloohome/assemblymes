import { getTranslations } from 'next-intl/server';

export default async function PieHomePage() {
  const t = await getTranslations('Pie');

  return (
    <div className="p-8 md:p-10">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
          PIE Management
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
          {t('welcome_title')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          {t('welcome_description')}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">{t('items')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('items_description')}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">{t('boms')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('boms_description')}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">{t('routings')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('routings_description')}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">{t('work_centers')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('work_centers_description')}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">{t('employees')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('employees_description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
