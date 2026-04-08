import { getTranslations } from 'next-intl/server';

export default async function CostPage() {
  const t = await getTranslations('Cost');

  return (
    <div className="space-y-6 p-8 md:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('description')}</p>
      </div>
    </div>
  );
}
