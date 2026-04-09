'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function LanguageSwitcher() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(nextLocale: string | null) {
    if (!nextLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale as "en" | "zh" });
    });
  }

  return (
    <div className="flex justify-end mb-4">
      <Select defaultValue={locale} onValueChange={(v) => onSelectChange(v ? String(v) : null)} disabled={isPending}>
        <SelectTrigger className="w-[120px] bg-slate-900/50 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors shadow-lg backdrop-blur-sm">
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          <SelectItem value="zh" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('language_zh')}</SelectItem>
          <SelectItem value="en" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('language_en')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}