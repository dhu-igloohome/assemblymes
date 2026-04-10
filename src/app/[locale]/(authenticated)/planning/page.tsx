'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  ListTodo, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  LayoutGrid,
  Zap,
  Package
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PlanningSummary {
  workOrderCount: number;
  shortageCount: number;
  safetyWarningCount: number;
  overloadedCenterCount: number;
}

interface ShortageRow {
  workOrderNo: string;
  skuItemCode: string;
  plannedQty: number;
  availableQty: number;
  shortageQty: number;
  status: string;
}

interface SafetyWarningRow {
  itemCode: string;
  availableQty: number;
  safetyStock: number;
  gapQty: number;
}

interface CapacityRow {
  workCenterCode: string;
  name: string;
  dailyCapacityHours: number;
  plannedLoadHours: number;
  utilizationPct: number;
}

interface OverviewResponse {
  summary: PlanningSummary;
  shortage: ShortageRow[];
  safetyWarnings: SafetyWarningRow[];
  capacity: CapacityRow[];
}

export default function PlanningPage() {
  const t = useTranslations('Planning');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [planningRes, ordersRes] = await Promise.all([
        fetch('/api/planning/overview', { cache: 'no-store' }),
        fetch('/api/sales-orders?status=CONFIRMED', { cache: 'no-store' })
      ]);

      if (planningRes.ok) {
        const payload = await planningRes.json();
        setData(payload);
      }
      
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        // 过滤掉已经完全下达工单的订单
        setPendingOrders(orders.filter((o: any) => !o.workOrders || o.workOrders.length === 0));
      }
    } catch {
      setError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">生产排产中心</h1>
          <p className="text-slate-500 font-medium">Production Scheduling & MRP</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200">
            物料齐套性检查
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100">
            自动排产建议
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左侧：待排产订单池 - 小厂生产的源头 */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <ListTodo className="size-5 text-indigo-400" />
                  待排产订单池
                </CardTitle>
                <span className="bg-indigo-500 text-white border-none px-2 py-0.5 rounded-full text-[10px] font-bold">{pendingOrders.length}</span>
              </div>
              <CardDescription className="text-slate-400 font-medium">点击订单快速下达生产工单</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="p-5 hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter">
                        {order.orderNo}
                      </span>
                      <span className="text-xs font-black text-slate-900">{order.orderedQty} PCS</span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{order.customerName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">SKU: {order.skuItemCode}</p>
                    
                    <Button size="sm" className="w-full bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white font-black text-[10px] uppercase h-8 shadow-sm">
                      转为工单并下达 <ArrowRight className="ml-2 size-3" />
                    </Button>
                  </div>
                ))}
                {pendingOrders.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">
                    <CheckCircle2 className="size-12 mx-auto mb-4 text-slate-100" />
                    <p className="text-xs uppercase font-black">所有订单已完成排产</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：主排产计划与资源分析 */}
        <div className="lg:col-span-8 space-y-8">
          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-2xl">
              <TabsTrigger value="schedule" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                <Calendar className="size-4 mr-2" /> 生产任务计划
              </TabsTrigger>
              <TabsTrigger value="capacity" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                <LayoutGrid className="size-4 mr-2" /> 产能负载分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">工单信息</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">计划产出</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">物料状态</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">当前进度</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.shortage || []).map((row) => (
                      <TableRow key={row.workOrderNo} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-8 py-5">
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-900">{row.workOrderNo}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SKU: {row.skuItemCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-black text-slate-700">{row.plannedQty} <span className="text-[10px] text-slate-400">PCS</span></div>
                        </TableCell>
                        <TableCell>
                          {row.shortageQty > 0 ? (
                            <span className="inline-flex items-center border border-red-100 bg-red-50 text-red-600 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                              <AlertTriangle className="size-3 mr-1" /> 缺料 {row.shortageQty}
                            </span>
                          ) : (
                            <span className="inline-flex items-center border border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3 mr-1" /> 物料齐套
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                              <span>Progress</span>
                              <span>{Math.round((row.availableQty / row.plannedQty) * 100)}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${row.shortageQty > 0 ? 'bg-amber-400' : 'bg-indigo-600'}`} 
                                style={{ width: `${Math.min(100, (row.availableQty / row.plannedQty) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                           <Button variant="ghost" size="sm" className="font-black text-indigo-600 text-[10px] uppercase">调整</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.shortage?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                           <Zap className="size-12 text-slate-100 mx-auto mb-4" />
                           <p className="text-xs text-slate-400 font-black uppercase italic">No active production tasks</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="capacity">
              <div className="grid gap-6 md:grid-cols-2">
                {(data?.capacity || []).map((row) => (
                  <Card key={row.workCenterCode} className="border-2 border-slate-100 shadow-none rounded-3xl overflow-hidden hover:border-indigo-200 transition-all">
                    <CardHeader className="pb-4 border-b border-slate-50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">{row.name}</CardTitle>
                        <span className={`${row.utilizationPct > 100 ? 'bg-red-500' : 'bg-emerald-500'} text-white border-none text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                          {row.utilizationPct}% 负载
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">能力 / 计划 (Hrs)</p>
                             <p className="text-2xl font-black text-slate-900">{row.dailyCapacityHours} <span className="text-slate-300 font-medium">/</span> {row.plannedLoadHours}</p>
                           </div>
                           <Package className="size-8 text-slate-100" />
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${row.utilizationPct > 100 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${Math.min(100, row.utilizationPct)}%` }} 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
