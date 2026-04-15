'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { toast } from 'sonner';
import { 
  Network, 
  Database, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ArrowRightLeft,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IntegrationsPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Record<string, string>>({
    ERP: '2026-04-15 10:00:00',
    FINANCE: '2026-04-15 09:00:00'
  });

  const handleSync = async (system: 'ERP' | 'FINANCE') => {
    setSyncing(system);
    const promise = fetch('/api/system/external-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system })
    });

    toast.promise(promise, {
      loading: `Synchronizing with External ${system} System...`,
      success: async (res) => {
        if (!res.ok) throw new Error('SYNC_FAILED');
        const data = await res.json();
        const now = new Date().toLocaleString();
        setLastSync(prev => ({ ...prev, [system]: now }));
        return `${system} Data Linkage Successful: ${data.details.recordsSynced} records updated.`;
      },
      error: 'Integration Link Failure. Check gateway status.'
    });

    setSyncing(null);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Network className="size-8 text-indigo-600" />
            {t('integration_hub')}
          </h1>
          <p className="text-slate-500 font-medium">{t('integration_desc')}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* ERP Integration */}
        <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-indigo-600 text-white pb-8">
            <div className="flex justify-between items-start">
               <div className="space-y-1">
                 <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Database className="size-5" />
                    {t('erp_sync')}
                 </CardTitle>
                 <CardDescription className="text-indigo-100">Sync Orders & Master Data</CardDescription>
               </div>
               <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                 Connected
               </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
             <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('last_sync')}</p>
                   <p className="text-sm font-bold text-slate-700">{lastSync.ERP}</p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-500" />
             </div>
             
             <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Data Streams</p>
                <div className="flex gap-2">
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100">Purchase Orders</span>
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100">Item Master</span>
                </div>
             </div>

             <Button 
                onClick={() => void handleSync('ERP')}
                disabled={syncing === 'ERP'}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100"
             >
                {syncing === 'ERP' ? <RefreshCw className="size-5 animate-spin mr-2" /> : <ArrowRightLeft className="size-5 mr-2" />}
                {t('btn_sync_now')}
             </Button>
          </CardContent>
        </Card>

        {/* Finance Integration */}
        <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-emerald-600 text-white pb-8">
            <div className="flex justify-between items-start">
               <div className="space-y-1">
                 <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Coins className="size-5" />
                    {t('finance_sync')}
                 </CardTitle>
                 <CardDescription className="text-emerald-100">Push Labor & Material Costs</CardDescription>
               </div>
               <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                 Connected
               </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
             <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('last_sync')}</p>
                   <p className="text-sm font-bold text-slate-700">{lastSync.FINANCE}</p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-500" />
             </div>

             <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Data Streams</p>
                <div className="flex gap-2">
                   <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100">Labor Cost</span>
                   <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100">Scrap Entries</span>
                </div>
             </div>

             <Button 
                onClick={() => void handleSync('FINANCE')}
                disabled={syncing === 'FINANCE'}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-100"
             >
                {syncing === 'FINANCE' ? <RefreshCw className="size-5 animate-spin mr-2" /> : <ArrowRightLeft className="size-5 mr-2" />}
                {t('btn_sync_now')}
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Integration Logs (Mocked via Audit Log UI link) */}
      <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-slate-900 text-white">
        <CardContent className="p-8 flex justify-between items-center">
           <div className="flex items-center gap-6">
              <div className="size-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                 <Activity className="size-8 text-indigo-400" />
              </div>
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Real-time Integration Stream</h3>
                 <p className="text-slate-400 text-sm font-medium">Detailed synchronization history is being recorded in the system audit logs.</p>
              </div>
           </div>
           <Link href="/pie/system/audit-logs">
             <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest h-12 px-8 rounded-xl">
                View All Logs
             </Button>
           </Link>
        </CardContent>
      </Card>
    </div>
  );
}
