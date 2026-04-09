'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, User, Phone, Clock } from 'lucide-react';

interface Feedback {
  id: string;
  content: string;
  nickname: string | null;
  contact: string | null;
  ip: string | null;
  createdAt: string;
}

export default function VisitorFeedbackPage() {
  const t = useTranslations('System');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFeedbacks() {
      try {
        const res = await fetch('/api/feedback');
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(`Failed to load feedback: ${data.error || res.statusText} (${res.status})`);
        }
      } catch (err) {
        setError(`Failed to load feedback: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
    void loadFeedbacks();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="size-6 text-indigo-600" />
            {t('visitor_feedback_title') || '访客留言反馈'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">查看所有访客提交的建议、疑问和合作意向。</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">正在加载中...</p>
        ) : error ? (
          <p className="p-8 text-center text-red-500">{error}</p>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-1/2">留言内容</TableHead>
                <TableHead>访客信息</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>来源 IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap py-2">
                      {item.content}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <User className="size-3.5 text-slate-400" />
                        {item.nickname || '匿名访客'}
                      </div>
                      {item.contact && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="size-3.5 text-slate-400" />
                          {item.contact}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="size-3.5 text-slate-400" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-slate-400">{item.ip || 'unknown'}</span>
                  </TableCell>
                </TableRow>
              ))}
              {feedbacks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-slate-400">
                    目前暂无留言记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
