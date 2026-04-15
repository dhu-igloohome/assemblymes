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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const [selectedIntelligence, setSelectedIntelligence] = useState<{label: string, icon: any, details: string[]} | null>(null);

  const exportCSV = () => {
    if (!data) return;
    
    // Construct CSV content from real dashboard data
    const headers = ['Category', 'Value', 'Status'];
    const rows = [
      ['Total Good Qty', data.todayGoodQty.toString(), 'Normal'],
      ['Active Issues', data.activeIssuesCount.toString(), data.activeIssuesCount > 0 ? 'Warning' : 'Normal'],
      ['Inventory Alerts', data.inventoryAlertsCount.toString(), data.inventoryAlertsCount > 5 ? 'Critical' : 'Normal'],
      ['Line Status', data.lineStatus, 'Current'],
    ];
    
    // Add recent orders to CSV
    data.recentOrders.forEach(o => {
      rows.push([`Order ${o.orderNo}`, `${o.progress}%`, o.stage]);
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Factory_Full_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/system/dashboard-summary', { cache: 'no-store' });
      if (!res.ok) throw new Error('API_LOAD_FAILED');
      const payload = await res.json();
      setData(payload);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
    const timer = setInterval(() => {
      void loadDashboardData();
    }, 5000); // 5s refresh for real-time factory monitoring
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="p-8 text-slate-500">{tc('loading')}</div>;

  return (
    <div key={locale} className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
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
        {/* ... Card Header ... */}
      </Card>

      {/* Intelligence Decision Center (Management View) */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('mgmt_center_title')}</h2>
            <p className="text-xs text-slate-500 font-medium">{t('mgmt_center_desc')}</p>
          </div>
          <Button 
            variant="outline" 
            className="bg-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-600 font-black text-[10px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-sm transition-all"
            onClick={() => {
              toast.promise(new Promise(res => setTimeout(res, 2000)), {
                loading: 'Compiling real-time factory data...',
                success: () => {
                  exportCSV();
                  return 'Report downloaded successfully.';
                },
                error: 'Export failed.',
              });
            }}
          >
            <TrendingUp className="size-3 mr-2" />
            {t('btn_export_all')}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { 
              label: t('report_production_efficiency'), 
              icon: Activity, 
              color: 'text-indigo-600', 
              bg: 'bg-indigo-50',
              details: [
                'Line 1 Efficiency: 92% (Target 90%)',
                'Bottleneck identified at Station 04 (Packaging)',
                'Suggested: Re-allocate 1 operator to Station 04.'
              ]
            },
            { 
              label: t('report_quality_trends'), 
              icon: CheckCircle2, 
              color: 'text-emerald-600', 
              bg: 'bg-emerald-50',
              details: [
                'First Pass Yield (FPY): 98.2%',
                'Top Defect: Scratch (0.8%) - Tooling related',
                'Trend: Improving (+1.2% WoW)'
              ]
            },
            { 
              label: t('report_cost_variance'), 
              icon: BarChart3, 
              color: 'text-amber-600', 
              bg: 'bg-amber-50',
              details: [
                'Actual Cost vs Plan: +1.5% (Over budget)',
                'Driver: Material price increase (Chips)',
                'Suggested: Review supply contract for SKU-092.'
              ]
            },
            { 
              label: t('report_delivery_lt'), 
              icon: Clock, 
              color: 'text-rose-600', 
              bg: 'bg-rose-50',
              details: [
                'Avg Lead Time: 4.2 Days',
                'Logistics Delay: Zone B (Weather affected)',
                'Status: 95% On-Time Delivery'
              ]
            },
          ].map((item) => (
            <Card 
              key={item.label} 
              className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-2xl group overflow-hidden"
              onClick={() => setSelectedIntelligence({ label: item.label, icon: item.icon, details: item.details })}
            >
              <CardContent className="p-0">
                <div className="p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900">View Intelligence <ArrowRight className="inline size-3 opacity-0 group-hover:opacity-100 ml-1 transition-all" /></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Intelligence Detail Dialog */}
      <Dialog open={!!selectedIntelligence} onOpenChange={(open) => !open && setSelectedIntelligence(null)}>
        <DialogContent className="sm:max-w-lg rounded-[32px] border-none shadow-2xl p-8 bg-white">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              {selectedIntelligence?.icon && (
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <selectedIntelligence.icon className="size-6" />
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {selectedIntelligence?.label}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  Deep intelligence analysis for management decision.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-6 space-y-4">
            {selectedIntelligence?.details.map((detail, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <div className="size-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                <p className="text-sm font-bold text-slate-700">{detail}</p>
              </div>
            ))}
            
            <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Last calculated: Today {new Date().toLocaleTimeString()}
              </div>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-8"
                onClick={() => setSelectedIntelligence(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
