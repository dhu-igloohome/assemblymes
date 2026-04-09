'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LoginForm() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, locale }),
      });

      const result = await response.json();

      if (!response.ok) {
        const code = typeof result?.error === 'string' ? result.error : '';
        if (code === 'LOGIN_RATE_LIMITED') {
          setErrorMessage(t('rate_limited'));
        } else if (code === 'LOGIN_FAILED') {
          setErrorMessage(t('request_failed'));
        } else {
          setErrorMessage(t('invalid_credentials'));
        }
        return;
      }

      window.location.assign(result.redirectTo ?? `/${locale}/dashboard`);
    } catch {
      setErrorMessage(t('request_failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <LanguageSwitcher />
        <Card className="gap-0 bg-slate-900 py-0 ring-slate-800">
          <CardHeader className="space-y-1 rounded-t-xl border-b border-slate-800 bg-slate-900 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-indigo-300">
              AssemblyMES
            </CardTitle>
            <CardDescription className="space-y-2">
              <span className="block text-slate-100">{t('title')}</span>
              <span className="block text-xs font-normal text-slate-400 leading-snug">
                {t('tagline')}
              </span>
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 bg-slate-900 pt-5">
              <div className="space-y-2">
                <Input
                  id="username"
                  type="text"
                  placeholder={t('username_placeholder')}
                  className="h-12 border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder={t('password_placeholder')}
                  className="h-12 border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}
            </CardContent>
            <CardFooter className="border-t-0 bg-slate-900 pb-6">
              <Button
                type="submit"
                className="h-12 w-full bg-indigo-600 text-base font-semibold text-white hover:bg-indigo-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('submitting') : t('submit_button')}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Visitor Demo Notice */}
        <div className="mt-8 overflow-hidden rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 backdrop-blur-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            {t('demo_title')}
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {t('demo_description')}
          </p>
          <div className="mt-4 space-y-2.5 rounded-lg bg-slate-900/50 p-4 ring-1 ring-slate-800">
            <p className="text-[11px] font-medium text-indigo-200/80">
              {t('demo_status')}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-emerald-400">
                {t('demo_account', { username: 'anyone', password: 'anything' })}
              </p>
              <Button 
                variant="ghost" 
                size="xs" 
                className="h-7 px-2 text-[10px] text-slate-500 hover:text-indigo-300"
                onClick={() => {
                  setUsername('anyone');
                  setPassword('anything');
                }}
              >
                {t('submit_button')}
              </Button>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] italic text-slate-500">
            &ldquo;{t('demo_welcome')}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
