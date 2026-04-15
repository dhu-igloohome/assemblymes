'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  AlertTriangle, 
  BarChart3, 
  Boxes, 
  CheckCircle2, 
  PhoneCall, 
  TrendingUp,
  ArrowRight,
  Activity,
  Package,
  Zap,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardData {
  activeIssuesCount: number;
  activeIssuesList: any[];
  todayGoodQty: number;
  inventoryAlertsCount: number;
  lineStatus: 'RUNNING' | 'IDLE';
  recentOrders: any[];
  materialGaps: any[];
  debugInfo?: {
    timestamp: string;
    dbStatus: string;
  };
}

export default function GlobalDashboard() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');
  const tPie = useTranslations('Pie');
  const locale = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/system/dashboard-summary')
      .then(async (res) => {
        if (!res.ok) throw new Error('API_LOAD_FAILED');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-500">{tc('loading')}</div>;

  return (
    <div key={locale} className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Super Seeding Trigger (Visible at Top for Quick Access) */}
      <div className="p-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-white flex items-center justify-between group transition-all hover:bg-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Zap className="size-4 fill-white" />
          </div>
          <div>
            <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Full-Stack Closed Loop Test</p>
            <p className="text-[10px] font-medium text-indigo-600/70">Scenario: Users -&gt; SO -&gt; WO -&gt; Andon -&gt; QC -&gt; Delivery</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="default" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
          onClick={async () => {
            if (window.confirm('Execute Full-Stack Closed Loop? This will add complex scenario data.')) {
              const res = await fetch('/api/debug/seed-demo', { method: 'POST' });
              if (res.ok) window.location.reload();
            }
          }}
        >
          {t('btn_gen_report')} (EXECUTE SUPER LOOP)
        </Button>
      </div>

      {/* Locale Context: {locale} */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px] opacity-70">{t('line_status')}</p>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm ${
          data?.lineStatus === 'RUNNING' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className={`size-3 rounded-full animate-pulse ${
            data?.lineStatus === 'RUNNING' ? 'bg-emerald-500' : 'bg-slate-400'
          }`} />
          <span className="text-sm font-bold text-slate-700">
            {data?.lineStatus === 'RUNNING' ? t('status_running') : t('status_idle')}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
          ⚠️ {t('api_error', { error })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* ... existing cards ... */}
      </div>

      {/* Global Flow Tracking (Command Center) */}
      <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden rounded-[32px]">
        <CardHeader className="pb-2 border-b border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Activity className="size-5 text-indigo-400" />
                {t('flow_tracking_title')}
              </CardTitle>
              <CardDescription className="text-slate-400">{t('flow_tracking_desc')}</CardDescription>
            </div>
            <div className="flex gap-2">
               <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/10">
                 Real-time Monitor
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative">
             {/* Background Connector Line */}
             <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-indigo-500/20 via-indigo-500 to-indigo-500/20 -translate-y-1/2 z-0" />
             
             {[
               { stage: 'CONFIRMED', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
               { stage: 'WAIT_PLAN', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
               { stage: 'PRODUCING', icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
               { stage: 'WAIT_SHIP', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
               { stage: 'DELIVERED', icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-400/10' },
             ].map((s, idx) => {
               const count = (data?.recentOrders || []).filter(o => o.stage === s.stage).length;
               return (
                 <div key={s.stage} className="relative z-10 flex flex-col items-center group">
                   <div className={`size-16 rounded-2xl ${s.bg} flex items-center justify-center mb-3 border border-white/5 transition-all group-hover:scale-110 group-hover:border-white/20`}>
                     <s.icon className={`size-8 ${s.color}`} />
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t(`stage_${s.stage}`)}</p>
                     <p className="text-2xl font-black text-white">{count}</p>
                   </div>
                   {idx < 4 && (
                     <div className="md:hidden flex justify-center mt-2">
                       <ArrowRight className="size-4 text-slate-700" />
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-lg border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-800">{t('order_delivery_progress')}</CardTitle>
              <CardDescription>{t('order_delivery_desc')}</CardDescription>
            </div>
            <Link href="/o2c">
              <Button variant="outline" size="sm" className="font-bold border-slate-200">
                {t('btn_view_all_orders')} <ArrowRight className="ml-2 size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(data?.recentOrders || []).map((order) => (
                <div key={order.orderNo} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                        {order.orderNo}
                      </span>
                      <h4 className="text-sm font-bold text-slate-700 mt-1">{order.customerName}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block">
                        {t(`stage_${order.stage}`)}
                      </span>
                      <span className="text-sm font-black text-slate-900">{order.progress}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        order.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-indigo-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="size-5 text-amber-400 fill-amber-400" />
                {t('quick_access_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { name: t('quick_access_report'), href: '/execution/report', icon: Activity },
                { name: t('quick_access_inventory'), href: '/inventory', icon: Package },
                { name: t('quick_access_quality'), href: '/quality', icon: CheckCircle2 },
                { name: t('quick_access_planning'), href: '/planning', icon: Clock },
              ].map((m) => (
                <Link key={m.name} href={m.href} className="block">
                  <div className="flex flex-col items-center justify-center p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10 aspect-square">
                    <m.icon className="size-6 mb-2" />
                    <span className="text-xs font-bold">{m.name}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <AlertTriangle className="size-4" />
                {t('pending_issues_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data?.activeIssuesList?.map((issue: any) => (
                <div key={issue.id} className="p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="font-bold text-red-800 line-clamp-1">{issue.description}</p>
                  <p className="text-[10px] text-red-600 font-medium mt-1">{new Date(issue.reportedAt).toLocaleString()}</p>
                </div>
              ))}
              {(!data?.activeIssuesList || data.activeIssuesList.length === 0) && (
                <p className="text-slate-400 italic py-4 text-center">{t('no_pending_issues')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-2 bg-slate-900 text-white">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="size-4 text-amber-400" />
                {t('material_gap_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-sm">
              {(data?.materialGaps || []).map((gap: any) => (
                <div key={gap.itemCode} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-slate-700">{gap.itemName}</span>
                    <span className="text-xs font-black text-red-600">{t('material_gap_short', { qty: gap.gap })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-2">
                    <span>{gap.itemCode}</span>
                    <span>{t('material_gap_demand_info', { demand: gap.demand, inventory: gap.inventory })}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${Math.min(100, (gap.inventory / gap.demand) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
              {(!data?.materialGaps || data.materialGaps.length === 0) && (
                <p className="text-slate-400 italic py-8 text-center text-xs">{t('no_material_gaps')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 pt-8 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className={`size-1.5 rounded-full ${data ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {t('system_active')} • {new Date().toLocaleDateString()}
          </div>
          <div className="text-[10px] font-mono text-slate-300 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase">
            {data?.debugInfo?.dbStatus === 'CONNECTED' ? t('debug_connected') : 'DB: DISCONNECTED'} • {data?.debugInfo?.timestamp || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
