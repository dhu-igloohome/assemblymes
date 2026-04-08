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
        setErrorMessage(result.error ?? t('invalid_credentials'));
        return;
      }

      window.location.assign(result.redirectTo ?? `/${locale}/pie`);
    } catch {
      setErrorMessage(t('request_failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <LanguageSwitcher />
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-blue-600">
              AssemblyMES
            </CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">{t('title')}</span>
              <span className="block text-xs font-normal text-muted-foreground leading-snug">
                {t('tagline')}
              </span>
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="username"
                  type="text"
                  placeholder={t('username_placeholder')}
                  className="h-12 text-base"
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
                  className="h-12 text-base"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('submitting') : t('submit_button')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
