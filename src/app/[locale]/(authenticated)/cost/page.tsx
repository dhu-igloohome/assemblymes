'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Coins, 
  TrendingDown, 
  BarChart3, 
  History, 
  PieChart, 
  Search, 
  ChevronRight, 
  Plus, 
  DollarSign, 
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  Wrench,
  Settings2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type CostEntryType = 'MATERIAL' | 'LABOR' | 'OVERHEAD' | 'ADJUSTMENT';

interface CostEntryRow {
  id: string;
  workOrder: { workOrderNo: string; skuItemCode: string; batchNo: string } | null;
  entryType: CostEntryType;
  amount: string;
  currency: string;
  sourceType: string | null;
  sourceRef: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface CostSummaryRow {
  workOrderNo: string;
  skuItemCode: string;
  batchNo: string;
  plannedQty: number;
  status: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  adjustmentCost: number;
  totalCost: number;
  unitCost: number;
}

const ENTRY_TYPES: CostEntryType[] = ['MATERIAL', 'LABOR', 'OVERHEAD', 'ADJUSTMENT'];

export default function CostPage() {
  const t = useTranslations('Cost');
  const tc = useTranslations('Common');
  const [entries, setEntries] = useState<CostEntryRow[]>([]);
  const [summary, setSummary] = useState<CostSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkOrderNo, setSelectedWorkOrderNo] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [workOrderNo, setWorkOrderNo] = useState('');
  const [entryType, setEntryType] = useState<CostEntryType>('MATERIAL');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [sourceType, setSourceType] = useState('MANUAL');
  const [sourceRef, setSourceRef] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch('/api/cost/entries', { cache: 'no-store' }),
        fetch('/api/cost/work-orders/summary', { cache: 'no-store' }),
      ]);
      if (!entriesRes.ok || !summaryRes.ok) {
        setEntries([]);
        setSummary([]);
        setListError(t('load_failed'));
        return;
      }
      const entriesData = (await entriesRes.json()) as CostEntryRow[];
      const summaryData = (await summaryRes.json()) as CostSummaryRow[];
      setEntries(entriesData);
      setSummary(summaryData);
      if (summaryData.length > 0 && !selectedWorkOrderNo) {
        setSelectedWorkOrderNo(summaryData[0].workOrderNo);
      }
    } catch {
      setEntries([]);
      setSummary([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, selectedWorkOrderNo]);

  const selectedSummary = useMemo(
    () => summary.find((s) => s.workOrderNo === selectedWorkOrderNo) ?? null,
    [summary, selectedWorkOrderNo]
  );

  const filteredSummary = summary.filter(s => 
    s.workOrderNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.skuItemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const entriesForSelected = useMemo(
    () => entries.filter(e => e.workOrder?.workOrderNo === selectedWorkOrderNo),
    [entries, selectedWorkOrderNo]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mapError = (code: string) => {
    const m: Record<string, string> = {
      COST_ENTRY_TYPE_INVALID: 'entry_type_invalid',
      COST_ENTRY_AMOUNT_INVALID: 'amount_invalid',
      COST_ENTRY_CURRENCY_INVALID: 'currency_invalid',
      WORK_ORDER_NOT_FOUND: 'work_order_not_found',
    };
    return m[code] ? t(m[code]) : t('save_failed');
  };

  const createEntry = async () => {
    setIsSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      const res = await fetch('/api/cost/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNo: workOrderNo.trim(),
          entryType,
          amount: Number.parseFloat(amount),
          currency: currency.trim().toUpperCase(),
          sourceType: sourceType.trim(),
          sourceRef: sourceRef.trim(),
          createdBy: createdBy.trim(),
          notes: notes.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFormError(mapError(payload?.error ?? ''));
        return;
      }
      setAmount('');
      setSourceRef('');
      setNotes('');
      setMessage(t('create_success'));
      setIsCreateDialogOpen(false);
      await loadData();
    } catch {
      setFormError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* {t('header_archive')} */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('title')}</h1>
          <p className="text-slate-500 font-medium">Cost Analysis & Financial Control</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadData()}>
            {tc('refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('btn_add_adjustment')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('header_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Coins className="size-5 text-indigo-400" />
                {t('archive_title')}
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 italic">{tc('loading')}</div>
                ) : filteredSummary.map((row) => (
                  <div 
                    key={row.workOrderNo} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedWorkOrderNo === row.workOrderNo ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedWorkOrderNo(row.workOrderNo)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.workOrderNo}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded uppercase tracking-tighter">
                        {t('total_cost_label')}: ¥{row.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{row.skuItemCode}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Calculator className="size-3" /> {t('col_unit_cost')}: ¥{row.unitCost.toFixed(2)}
                         </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredSummary.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('no_matching')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('header_console')} */}
        <div className="lg:col-span-8 space-y-8">
          {selectedSummary ? (
            <>
              {/* {t('header_kpis')} */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('total_label')}</label>
                  <p className="text-xl font-black text-slate-900">¥{selectedSummary.totalCost.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('unit_cost_label')}</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">¥{selectedSummary.unitCost.toFixed(2)}</p>
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                       <ArrowDownRight className="size-3" /> 2.4%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('anomaly_label')}</label>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <p className="text-sm font-bold text-slate-900">{t('status_normal')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className="font-black text-[10px] uppercase tracking-widest"
                    onClick={() => alert('Generating Cost Intelligence Report... Data compilation in progress.')}
                  >
                    {t('btn_generate_report')}
                  </Button>
                </div>
              </div>

              {listError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{listError}</div>}
              {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{message}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="analysis" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <BarChart3 className="size-4 mr-2" /> {t('tab_analysis')}
                  </TabsTrigger>
                  <TabsTrigger value="entries" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> {t('tab_entries')}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Settings2 className="size-4 mr-2" /> {t('tab_settings')}
                  </TabsTrigger>
                </TabsList>

                {/* {t('tab_analysis')} */}
                <TabsContent value="analysis" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <PieChart className="size-4 text-indigo-600" />
                            {t('card_structure_title')}
                         </h3>
                         <div className="space-y-6">
                            {[
                               { label: t('label_material'), value: selectedSummary.materialCost, icon: <Package className="size-3" />, color: 'bg-indigo-500' },
                               { label: t('label_labor'), value: selectedSummary.laborCost, icon: <Users className="size-3" />, color: 'bg-emerald-500' },
                               { label: t('label_overhead'), value: selectedSummary.overheadCost, icon: <Wrench className="size-3" />, color: 'bg-amber-500' },
                               { label: t('label_adjustment'), value: selectedSummary.adjustmentCost, icon: <ArrowUpRight className="size-3" />, color: 'bg-slate-400' },
                            ].map((item) => (
                               <div key={item.label} className="space-y-2">
                                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                                     <div className="flex items-center gap-2 text-slate-500">
                                        {item.icon} {item.label}
                                     </div>
                                     <span className="text-slate-900">¥{item.value.toLocaleString()} ({((item.value / selectedSummary.totalCost) * 100).toFixed(1)}%)</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                     <div className={`h-full ${item.color}`} style={{ width: `${(item.value / selectedSummary.totalCost) * 100}%` }} />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </Card>

                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">{t('ai_analysis_title')}</h3>
                            <div className="space-y-4">
                               <p className="text-xs text-slate-400 leading-relaxed">
                                  {t('ai_analysis_desc', { material_percent: ((selectedSummary.materialCost / selectedSummary.totalCost) * 100).toFixed(0), unit_cost: selectedSummary.unitCost.toFixed(2) })}
                               </p>
                               <div className="pt-4 grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('stat_profit')}</p>
                                     <p className="text-lg font-black italic">--</p>
                                  </div>
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('stat_risk')}</p>
                                     <p className="text-lg font-black italic text-emerald-400">{t('stat_risk_low')}</p>
                                  </div>
                                </div>
                            </div>
                         </div>
                         <ArrowUpRight className="absolute -bottom-10 -right-10 size-64 text-white/5" />
                      </Card>
                   </div>
                </TabsContent>

                {/* {t('tab_entries')} */}
                <TabsContent value="entries" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_type')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_amount')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_ref')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_time')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entriesForSelected.map((entry) => (
                          <TableRow key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 py-4">
                               <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                 entry.entryType === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-600' :
                                 entry.entryType === 'MATERIAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                               }`}>
                                 {t(`entry_type_${entry.entryType.toLowerCase()}` as Parameters<typeof t>[0])}
                               </span>
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">¥{Number(entry.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-500 uppercase">{entry.sourceRef || '-'}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                        {entriesForSelected.length === 0 && (
                           <TableRow>
                              <TableCell colSpan={4} className="py-12 text-center text-slate-300 italic text-xs uppercase font-black">{t('no_entries')}</TableCell>
                           </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* {t('tab_settings')} */}
                <TabsContent value="settings" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <Settings2 className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('settings_desc')}</p>
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <BarChart3 className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* {t('dialog_container')} */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('dialog_title')}</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">{t('dialog_desc')}</DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_wo')}</label>
               <Input
                 placeholder={t('field_wo_placeholder')}
                 value={workOrderNo}
                 onChange={(e) => setWorkOrderNo(e.target.value)}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_type')}</label>
                  <select
                    className="w-full h-12 rounded-xl border-none bg-slate-50 px-3 text-sm font-bold"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as CostEntryType)}
                  >
                    {ENTRY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`entry_type_${type.toLowerCase()}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_currency')}</label>
                  <Input placeholder="CNY" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-12 bg-slate-50 border-none font-bold text-center" />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_amount')}</label>
               <Input placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 bg-slate-50 border-none font-black text-lg" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_ref')}</label>
               <Input placeholder="REF-2024-..." value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} className="h-12 bg-slate-50 border-none font-bold" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_notes')}</label>
               <Input placeholder={t('field_notes_placeholder')} value={notes} onChange={(e) => setNotes(e.target.value)} className="h-12 bg-slate-50 border-none font-bold" />
            </div>
            
            {formError && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-2">{formError}</p>}
            <div className="flex gap-3 mt-8">
               <Button variant="outline" className="flex-1 h-12 font-black rounded-xl" onClick={() => setIsCreateDialogOpen(false)}>{tc('cancel')}</Button>
               <Button
                 className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100"
                 disabled={isSubmitting}
                 onClick={() => void createEntry()}
               >
                 {isSubmitting ? tc('submitting') : tc('save')}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
