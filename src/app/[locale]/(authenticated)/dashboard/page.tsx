'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  AlertTriangle, 
  BarChart3, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  Package, 
  PhoneCall, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardData {
  activeIssuesCount: number;
  todayGoodQty: number;
  lowStockCount: number;
  recentOrders: any[];
}

export default function GlobalDashboard() {
  const t = useTranslations('Dashboard');
  const tPie = useTranslations('Pie');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/dashboard-summary')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-500">{tPie('loading')}</div>;
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('title')}</h1>
        <p className="text-slate-500 mt-1">Digital Factory Control Center - {tPie('module_description')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-100 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-red-900">{t('active_andon')}</CardTitle>
            <PhoneCall className="size-4 text-red-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{data?.activeIssuesCount || 0}</div>
            <p className="text-xs text-red-600 mt-1 font-medium">{tPie('execution_description')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">{t('today_output')}</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data?.todayGoodQty || 0}</div>
            <p className="text-xs text-slate-500 mt-1">PCS / 24H</p>
          </CardContent>
        </Card>

        <Card className={data?.lowStockCount ? 'border-amber-100 bg-amber-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">{t('inventory_alerts')}</CardTitle>
            <Boxes className={`size-4 ${data?.lowStockCount ? 'text-amber-600' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.lowStockCount ? 'text-amber-700' : 'text-slate-900'}`}>
              {data?.lowStockCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">{tPie('inventory_description')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">{t('recent_orders')}</CardTitle>
            <TrendingUp className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data?.recentOrders?.length || 0}</div>
            <p className="text-xs text-slate-500 mt-1">{tPie('module_o2c')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('recent_orders')}</CardTitle>
              <CardDescription>{tPie('o2c_description')}</CardDescription>
            </div>
            <Link href="/o2c">
              <Button variant="ghost" size="sm" className="text-indigo-600">
                {tPie('module_o2c')} <ArrowRight className="ml-1 size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.recentOrders || []).map((order: any) => (
                <div key={order.orderNo} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                    <p className="text-xs text-slate-500">{order.orderNo} · {order.skuItemCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{order.orderedQty} PCS</p>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 uppercase">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!data?.recentOrders || data.recentOrders?.length === 0) && (
                <p className="text-center py-6 text-slate-400 text-sm italic">{tPie('empty')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Module Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>{tPie('welcome_title')}</CardTitle>
            <CardDescription>{tPie('welcome_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: tPie('items'), href: '/pie/items', icon: Boxes, color: 'text-indigo-600' },
                { name: tPie('execution'), href: '/execution/report', icon: BarChart3, color: 'text-emerald-600' },
                { name: tPie('inventory'), href: '/inventory', icon: Package, color: 'text-amber-600' },
                { name: tPie('quality'), href: '/quality', icon: CheckCircle2, color: 'text-rose-600' },
                { name: tPie('module_o2c'), href: '/o2c', icon: TrendingUp, color: 'text-blue-600' },
                { name: tPie('module_cost'), href: '/cost', icon: Clock, color: 'text-slate-600' },
              ].map((m) => (
                <Link key={m.name} href={m.href}>
                  <Button variant="outline" className="w-full justify-start h-12 hover:bg-slate-50 border-slate-200">
                    <m.icon className={`mr-3 size-4 ${m.color}`} />
                    <span className="text-sm font-medium">{m.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
