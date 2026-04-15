'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  skuName: string;
  plannedQty: number;
  status: string;
  isReady: boolean;
  componentGaps: {
    componentCode: string;
    componentName: string;
    required: number;
    available: number;
    gap: number;
  }[];
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
  const tc = useTranslations('Common');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [expandedWO, setExpandedWO] = useState<string | null>(null);
  const [isAutoPlanning, setIsAutoPlanning] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [planningRes, ordersRes] = await Promise.all([
        fetch('/api/planning/overview', { cache: 'no-store' }),
        fetch('/api/o2c/orders?status=CONFIRMED', { cache: 'no-store' })
      ]);

      if (planningRes.ok) {
        const payload = await planningRes.json();
        setData(payload);
      }
      
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        // Filter out orders that have fully released work orders
        setPendingOrders(orders.filter((o: any) => !o.workOrders || o.workOrders.length === 0));
      }
    } catch {
      setError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleAutoPlan = async () => {
    if (pendingOrders.length === 0) return;
    setIsAutoPlanning(true);
    try {
      const res = await fetch('/api/planning/auto-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: pendingOrders.map(o => o.id) })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Auto plan failed:', err);
    } finally {
      setIsAutoPlanning(false);
    }
  };

  const totalRequiredHours = useMemo(() => {
    // Basic heuristic: sum of pending order quantities * avg hours per unit (mocking 0.5h/unit for now)
    return pendingOrders.reduce((sum, o) => sum + o.orderedQty * 0.5, 0);
  }, [pendingOrders]);

  const totalAvailableHours = useMemo(() => {
    return (data?.capacity || []).reduce((sum, c) => sum + c.dailyCapacityHours, 0);
  }, [data]);

  const isOverloaded = totalRequiredHours > totalAvailableHours;

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* {t('Header')} */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('center_title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="font-bold border-slate-200"
            onClick={() => {
              const firstShortage = data?.shortage.find(s => !s.isReady);
              if (firstShortage) {
                setExpandedWO(firstShortage.workOrderNo);
                const el = document.getElementById(`wo-${firstShortage.workOrderNo}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            {t('btn_check_material')}
          </Button>
          <Button 
            className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100"
            onClick={handleAutoPlan}
            disabled={isAutoPlanning || pendingOrders.length === 0}
          >
            {isAutoPlanning ? tc('submitting') : t('btn_auto_suggest')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_order_pool')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <ListTodo className="size-5 text-indigo-400" />
                  {t('card_order_pool')}
                </CardTitle>
                <span className="bg-indigo-500 text-white border-none px-2 py-0.5 rounded-full text-[10px] font-bold">{pendingOrders.length}</span>
              </div>
              <CardDescription className="text-slate-400 font-medium">{t('card_order_pool_desc')}</CardDescription>
              
              {pendingOrders.length > 0 && (
                <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Load</p>
                      <p className={`text-xl font-black ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalRequiredHours.toFixed(1)} <span className="text-[10px] text-slate-600 font-bold">/ {totalAvailableHours.toFixed(1)}H</span>
                      </p>
                    </div>
                    {isOverloaded && (
                      <div className="flex items-center gap-1 text-red-400 animate-pulse">
                        <AlertTriangle className="size-3" />
                        <span className="text-[8px] font-black uppercase">Capacity Overload</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleAutoPlan}
                    disabled={isAutoPlanning}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-900/40"
                  >
                    {isAutoPlanning ? tc('submitting') : 'Smart Convert All'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {pendingOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="p-5 hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (!isAutoPlanning) {
                        alert(`Order ${order.orderNo} selected. You can now convert it to a Work Order.`);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter">
                        {order.orderNo}
                      </span>
                      <span className="text-xs font-black text-slate-900">{order.orderedQty} PCS</span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{order.customerName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">SKU: {order.skuItemCode}</p>
                    
                    <Button 
                      size="sm" 
                      className="w-full bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white font-black text-[10px] uppercase h-8 shadow-sm"
                      onClick={async () => {
                        setIsAutoPlanning(true);
                        try {
                          const res = await fetch('/api/planning/auto-plan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderIds: [order.id] })
                          });
                          if (res.ok) await loadData();
                        } finally {
                          setIsAutoPlanning(false);
                        }
                      }}
                      disabled={isAutoPlanning}
                    >
                      {isAutoPlanning ? tc('submitting') : <>{t('btn_convert_to_wo')} <ArrowRight className="ml-2 size-3" /></>}
                    </Button>
                  </div>
                ))}
                {pendingOrders.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">
                    <CheckCircle2 className="size-12 mx-auto mb-4 text-slate-100" />
                    <p className="text-xs uppercase font-black">{t('all_orders_scheduled')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_planning')} */}
        <div className="lg:col-span-8 space-y-8">
          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-2xl">
              <TabsTrigger value="schedule" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                <Calendar className="size-4 mr-2" /> {t('tab_schedule')}
              </TabsTrigger>
              <TabsTrigger value="capacity" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                <LayoutGrid className="size-4 mr-2" /> {t('tab_capacity')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_wo_info')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_planned_output')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_material_status')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_current_progress')}</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.shortage || []).map((row) => (
                      <React.Fragment key={row.workOrderNo}>
                        <TableRow 
                          id={`wo-${row.workOrderNo}`}
                          className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedWO === row.workOrderNo ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => setExpandedWO(expandedWO === row.workOrderNo ? null : row.workOrderNo)}
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-900">{row.workOrderNo}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{row.skuName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-black text-slate-700">{row.plannedQty} <span className="text-[10px] text-slate-400">PCS</span></div>
                          </TableCell>
                          <TableCell>
                            {!row.isReady ? (
                              <span className="inline-flex items-center border border-red-100 bg-red-50 text-red-600 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                                <AlertTriangle className="size-3 mr-1" /> {t('status_shortage', { qty: row.componentGaps.length })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center border border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="size-3 mr-1" /> {t('status_ready')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="w-24 space-y-1">
                              <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                <span>MRP Match</span>
                                <span>{row.isReady ? '100' : Math.round(((row.componentGaps.length === 0 ? 1 : 0.5)) * 100)}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${!row.isReady ? 'bg-amber-400' : 'bg-indigo-600'}`} 
                                  style={{ width: `${row.isReady ? 100 : 50}%` }} 
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                             <Button variant="ghost" size="sm" className="font-black text-indigo-600 text-[10px] uppercase">
                               {expandedWO === row.workOrderNo ? 'Close' : t('btn_check_material')}
                             </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Component Shortage View */}
                        {expandedWO === row.workOrderNo && (
                          <TableRow className="bg-slate-50/50 border-none">
                            <TableCell colSpan={5} className="p-0">
                               <div className="px-8 py-6 space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Package className="size-4 text-slate-400" />
                                     <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Component Shortage Breakdown</h5>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                     {row.componentGaps.map(gap => (
                                        <div key={gap.componentCode} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                           <div>
                                              <p className="text-[10px] font-black text-indigo-600">{gap.componentCode}</p>
                                              <p className="text-xs font-bold text-slate-800">{gap.componentName}</p>
                                           </div>
                                           <div className="text-right">
                                              <p className="text-[10px] font-black text-red-500 uppercase">Short: {gap.gap}</p>
                                              <p className="text-[10px] text-slate-400 font-medium">Inv: {gap.available} / Req: {gap.required}</p>
                                           </div>
                                        </div>
                                     ))}
                                     {row.componentGaps.length === 0 && (
                                        <div className="col-span-full py-4 text-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-xl border border-emerald-100">
                                           All components are fully matched for this order.
                                        </div>
                                     )}
                                  </div>
                               </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {(data?.shortage?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                           <Zap className="size-12 text-slate-100 mx-auto mb-4" />
                           <p className="text-xs text-slate-400 font-black uppercase italic">{t('no_active_tasks')}</p>
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
                          {row.utilizationPct}% {t('label_load')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('label_capacity_planned')}</p>
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
