'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, User, Phone, Clock, Search, ChevronRight, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadFeedbacks() {
      try {
        const res = await fetch('/api/feedback');
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data);
        } else {
          setError('Failed to load feedback');
        }
      } catch {
        setError('Failed to load feedback');
      } finally {
        setIsLoading(false);
      }
    }
    void loadFeedbacks();
  }, []);

  const filteredFeedbacks = feedbacks.filter(f => 
    f.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('feedback_hall')}</h1>
          <p className="text-slate-500 font-medium">{t('feedback_hall_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => window.location.reload()}>
            {t('Common.refresh')}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white pb-6">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <MessageSquare className="size-5 text-indigo-400" />
            {t('feedback_stream')}
          </CardTitle>
          <div className="relative mt-4">
            <Input 
              className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
              placeholder={t('feedback_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 size-4 text-slate-500" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center text-slate-400 italic">{t('Common.loading')}</div>
          ) : error ? (
            <div className="p-20 text-center text-red-500 font-bold uppercase tracking-widest">{error}</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 hover:bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('feedback_content')}</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('feedback_visitor')}</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('feedback_time')}</TableHead>
                  <TableHead className="pr-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('feedback_source')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((item) => (
                  <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-8 py-6">
                      <div className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap max-w-xl">
                        {item.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                          <User className="size-3.5 text-indigo-400" />
                          {item.nickname || t('feedback_anonymous')}
                        </div>
                        {item.contact && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Phone className="size-3.5" />
                            {item.contact}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <Clock className="size-3.5" />
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded">
                         IP: {item.ip || 'unknown'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredFeedbacks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-32 text-center">
                       <LayoutGrid className="size-12 text-slate-50 mx-auto mb-4" />
                       <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{t('feedback_no_records')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
