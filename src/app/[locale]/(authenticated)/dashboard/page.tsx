'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  Clock
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
}

export default function GlobalDashboard() {
  const t = useTranslations('Dashboard');
  const tPie = useTranslations('Pie');
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

  if (loading) return <div className="p-8 text-slate-500">{tPie('loading')}</div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 font-medium">Digital Factory Command Center</p>
        </div>
        
        {/* 产线状态指示灯 */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm ${
          data?.lineStatus === 'RUNNING' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className={`size-3 rounded-full animate-pulse ${
            data?.lineStatus === 'RUNNING' ? 'bg-emerald-500' : 'bg-slate-400'
          }`} />
          <span className="text-sm font-bold text-slate-700">
            {data?.lineStatus === 'RUNNING' ? '产线运行中 (RUNNING)' : '产线待机 (IDLE)'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
          ⚠️ 数据连接异常: {error}
        </div>
      )}

      {/* 第一排：核心 KPI - 重点在于异常提示 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`border-2 transition-all ${data?.activeIssuesCount ? 'border-red-200 bg-red-50/50 shadow-red-100' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex justify-between">
              {t('active_andon')}
              <PhoneCall className={`size-4 ${data?.activeIssuesCount ? 'text-red-600 animate-bounce' : 'text-slate-300'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-black ${data?.activeIssuesCount ? 'text-red-700' : 'text-slate-900'}`}>
              {data?.activeIssuesCount || 0}
            </div>
            <p className="text-[10px] font-bold mt-1 text-slate-400">当前待处理现场异常</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex justify-between">
              {t('today_output')}
              <Zap className="size-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-indigo-700">{data?.todayGoodQty || 0}</div>
            <p className="text-[10px] font-bold mt-1 text-slate-400">今日良品总产出 (PCS)</p>
          </CardContent>
        </Card>

        <Card className={`border-2 transition-all ${data?.inventoryAlertsCount ? 'border-amber-200 bg-amber-50/50' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex justify-between">
              {t('inventory_alerts')}
              <Boxes className="size-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-amber-700">{data?.inventoryAlertsCount || 0}</div>
            <p className="text-[10px] font-bold mt-1 text-slate-400">低于安全库存项</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex justify-between">
              {t('recent_orders')}
              <TrendingUp className="size-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">{data?.recentOrders?.length || 0}</div>
            <p className="text-[10px] font-bold mt-1 text-slate-400">近 7 天执行中订单</p>
          </CardContent>
        </Card>
      </div>

      {/* 第二排：进度与执行 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* 订单进度条 - 小厂老板最想看的东西 */}
        <Card className="md:col-span-2 shadow-lg border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-800">订单交付进度</CardTitle>
              <CardDescription>实时跟踪每一笔订单的生产环节</CardDescription>
            </div>
            <Link href="/o2c">
              <Button variant="outline" size="sm" className="font-bold border-slate-200">
                全部订单 <ArrowRight className="ml-2 size-3" />
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
                        STATUS: {order.stage}
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

        {/* 快速任务通道 */}
        <div className="space-y-6">
          <Card className="bg-indigo-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="size-5 text-amber-400 fill-amber-400" />
                指挥部入口
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { name: '报工', href: '/execution/report', icon: Activity },
                { name: '查库', href: '/inventory', icon: Package },
                { name: '质检', href: '/quality', icon: CheckCircle2 },
                { name: '排产', href: '/planning', icon: Clock },
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
                待办异常记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data?.activeIssuesList?.map(issue => (
                <div key={issue.id} className="p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="font-bold text-red-800 line-clamp-1">{issue.description}</p>
                  <p className="text-[10px] text-red-600 font-medium mt-1">{issue.reportedAt}</p>
                </div>
              ))}
              {(!data?.activeIssuesList || data.activeIssuesList.length === 0) && (
                <p className="text-slate-400 italic py-4 text-center">暂无待处理异常</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
