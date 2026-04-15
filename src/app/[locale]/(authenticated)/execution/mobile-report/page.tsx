'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Scan, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  LayoutGrid,
  History,
  PhoneCall
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function MobileReportPage() {
  const t = useTranslations('Execution');
  const tc = useTranslations('Common');
  
  const [step, setStep] = useState<'scan' | 'report'>('scan');
  const [woSearch, setWoSearch] = useState('');
  const [selectedWo, setSelectedWo] = useState<any>(null);
  const [reportQty, setReportQty] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Handle Scan/Search
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!woSearch.trim()) return;
    
    try {
      const res = await fetch(`/api/work-orders?workOrderNo=${woSearch.trim()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setSelectedWo(data[0]);
          setReportQty(String(data[0].plannedQty - (data[0].completedQty || 0)));
          setStep('report');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Production
  const handleSubmit = async () => {
    if (!selectedWo || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/execution/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: selectedWo.id,
          goodQty: parseInt(reportQty, 10) || 0,
        })
      });
      if (res.ok) {
        setMessage({type: 'success', text: t('mobile_submit_success')});
        setTimeout(() => {
          setStep('scan');
          setWoSearch('');
          setSelectedWo(null);
          setMessage(null);
        }, 2000);
      }
    } catch (err) {
      setMessage({type: 'error', text: 'Failed'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDigit = (digit: string) => {
    setReportQty(prev => prev === '0' ? digit : prev + digit);
  };

  const clearDigit = () => {
    setReportQty('0');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Activity className="size-5 text-indigo-400" />
          {t('mobile_report_title')}
        </h1>
        <div className="px-3 py-1 rounded-full border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
          STATION: 001
        </div>
      </div>

      {step === 'scan' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-[32px] overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div className="size-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                <Scan className="size-12 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t('mobile_scan_hint')}</h2>
                <p className="text-slate-400 text-sm">Waiting for barcode scanner input...</p>
              </div>
              <form onSubmit={handleSearch} className="relative">
                <Input 
                  value={woSearch}
                  onChange={e => setWoSearch(e.target.value.toUpperCase())}
                  placeholder="Input WO No..."
                  className="h-16 bg-slate-800 border-slate-700 text-center text-xl font-black tracking-widest rounded-2xl focus:ring-4 focus:ring-indigo-500/20"
                />
                <Button type="submit" className="absolute right-2 top-2 h-12 w-12 rounded-xl bg-indigo-600">
                  <ChevronRight />
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
             <Button variant="outline" className="h-24 rounded-3xl border-slate-800 bg-slate-900 flex flex-col gap-2 font-bold text-slate-400">
                <History className="size-6" />
                History
             </Button>
             <Button variant="outline" className="h-24 rounded-3xl border-red-900/30 bg-red-950/20 flex flex-col gap-2 font-bold text-red-500 animate-pulse">
                <PhoneCall className="size-6" />
                {t('mobile_andon_call')}
             </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Card className="bg-slate-900 border-indigo-500/20 rounded-[32px] shadow-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Order</p>
                  <h3 className="text-2xl font-black text-white">{selectedWo?.workOrderNo}</h3>
                  <p className="text-xs text-indigo-400 font-bold">{selectedWo?.skuItemCode}</p>
                </div>
                <Button variant="ghost" className="text-slate-500 text-xs font-bold" onClick={() => setStep('scan')}>CANCEL</Button>
              </div>
              
              <div className="bg-slate-950 rounded-2xl p-6 text-center border border-slate-800">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-2">{t('mobile_finish_qty')}</p>
                 <div className="text-6xl font-black text-indigo-400 tracking-tighter tabular-nums">
                    {reportQty}
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Large Virtual Keyboard */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'].map((key) => (
              <Button 
                key={key}
                variant="outline"
                className={`h-16 text-xl font-black rounded-2xl border-slate-800 bg-slate-900 hover:bg-indigo-600 transition-all ${key === 'C' ? 'text-red-400' : 'text-white'}`}
                onClick={() => key === 'C' ? clearDigit() : addDigit(key)}
              >
                {key}
              </Button>
            ))}
          </div>

          <Button 
            className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 rounded-[28px] text-xl font-black uppercase shadow-2xl shadow-indigo-900/50"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? tc('submitting') : (
              <span className="flex items-center gap-3">
                <CheckCircle2 className="size-6" />
                {t('mobile_quick_report')}
              </span>
            )}
          </Button>

          {message && (
            <div className={`p-4 rounded-2xl text-center font-bold animate-bounce ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {message.text}
            </div>
          )}
        </div>
      )}

      {/* Navigation Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 p-2 flex justify-around items-center">
         <Button variant="ghost" className="flex flex-col h-14 w-20 gap-1 text-indigo-400 bg-indigo-500/10">
            <Scan className="size-5" />
            <span className="text-[10px] font-bold">Report</span>
         </Button>
         <Button variant="ghost" className="flex flex-col h-14 w-20 gap-1 text-slate-500">
            <LayoutGrid className="size-5" />
            <span className="text-[10px] font-bold">Menu</span>
         </Button>
      </div>
    </div>
  );
}
