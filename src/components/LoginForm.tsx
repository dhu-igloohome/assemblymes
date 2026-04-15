'use client';

import { useState, useEffect } from 'react';
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
import FeedbackBoard from '@/components/FeedbackBoard';

export default function LoginForm() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Silent public traffic tracking
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        await fetch('/api/public/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname, locale }),
        });
      } catch (e) {
        // Fail silently
      }
    };
    trackVisitor();
  }, [locale]);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 py-12">
      <div className="w-full max-w-5xl">
        <LanguageSwitcher />
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {/* Left Column: Login Card */}
          <div className="mx-auto w-full max-w-md space-y-6">
            <Card className="gap-0 bg-slate-900/80 py-0 ring-slate-800 shadow-2xl backdrop-blur-md">
              <CardHeader className="space-y-1 rounded-t-xl border-b border-slate-800 bg-slate-900/50 text-center">
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
                <CardContent className="space-y-4 bg-transparent pt-5">
                  <div className="space-y-2">
                    <Input
                      id="username"
                      type="text"
                      placeholder={t('username_placeholder')}
                      className="h-12 border-slate-700 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500/50"
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
                      className="h-12 border-slate-700 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500/50"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  {errorMessage ? (
                    <p className="text-sm font-medium text-red-500">{errorMessage}</p>
                  ) : null}
                </CardContent>
                <CardFooter className="border-t-0 bg-transparent pb-6">
                  <Button
                    type="submit"
                    className="h-12 w-full bg-indigo-600 text-base font-bold text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('submitting') : t('submit_button')}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Visitor Demo Notice Card (Simplified, inside left column) */}
            <div className="overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </span>
                {t('demo_title')}
              </h3>
              <div className="mt-4 space-y-2.5 rounded-lg bg-slate-950/50 p-4 ring-1 ring-slate-800">
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
            </div>
          </div>

          {/* Right Column: Feedback and Description */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-slate-100 mb-3">{t('demo_title')}</h2>
              <p className="text-sm leading-relaxed text-slate-400 mb-6">
                {t('demo_description')}
              </p>
              <p className="text-xs italic text-slate-500">
                &ldquo;{t('demo_welcome')}&rdquo;
              </p>
            </div>
            
            <FeedbackBoard />
          </div>
        </div>
      </div>
    </div>
  );
}
