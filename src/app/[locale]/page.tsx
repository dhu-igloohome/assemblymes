import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Index');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-5xl font-extrabold tracking-tight text-green-600 mb-4">
        {t('title')}
      </h1>
      <p className="text-lg text-green-600">
        {t('description')}
      </p>
    </main>
  );
}