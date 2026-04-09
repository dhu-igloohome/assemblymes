'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function FeedbackBoard() {
  const t = useTranslations('Login');
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError(t('feedback_required'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, nickname, contact }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setContent('');
        setNickname('');
        setContact('');
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        const data = await res.json().catch(() => ({}));
        const serverError = data.details || data.error;
        setError(serverError ? `[Server Error] ${serverError}` : t('feedback_error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-xl">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
        <MessageSquare className="size-5 text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200">{t('feedback_title')}</h3>
      </div>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="mb-3 size-12 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-400">{t('feedback_success')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder={t('feedback_placeholder')}
            className="min-h-[120px] resize-none border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:ring-indigo-500/50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
          />
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder={t('feedback_nickname')}
              className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              placeholder={t('feedback_contact')}
              className="border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-slate-100 font-bold text-slate-900 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                {t('submitting')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="size-4" />
                {t('feedback_submit')}
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
