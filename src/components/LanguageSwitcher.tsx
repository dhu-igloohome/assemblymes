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

  function onSelectChange(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale as "en" | "zh" });
    });
  }

  return (
    <div className="flex justify-end mb-4">
      <Select defaultValue={locale} onValueChange={onSelectChange} disabled={isPending}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="zh">{t('language_zh')}</SelectItem>
          <SelectItem value="en">{t('language_en')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}