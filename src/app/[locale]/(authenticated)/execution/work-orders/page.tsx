'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ClipboardList, 
  Settings2, 
  Plus, 
  Save, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  Zap,
  PlayCircle,
  PauseCircle,
  StopCircle,
  ChevronRight,
  TrendingUp,
  History,
  Monitor,
  LayoutGrid
} from 'lucide-react';

const WORK_ORDER_STATUS_OPTIONS = [
  'PLANNED',
  'RELEASED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

type WorkOrderStatus = (typeof WORK_ORDER_STATUS_OPTIONS)[number];

interface WorkOrderRow {
  id: string;
  workOrderNo: string;
  skuItemCode: string;
  batchNo: string;
  plannedQty: number;
  targetVersion: string | null;
  status: WorkOrderStatus;
  planStartDate: string | null;
  planEndDate: string | null;
  createdBy: string | null;
  notes: string | null;
  operations: Array<{
    id: string;
    workstation: string;
    sequence: number;
    operationName: string;
    status: 'PENDING' | 'STARTED' | 'PAUSED' | 'COMPLETED';
    completedQty: number;
  }>;
}

interface ItemOption {
  itemCode: string;
  itemName: string;
  itemType: 'PRODUCT' | 'ASSEMBLY' | 'MATERIAL';
}

export default function WorkOrdersPage() {
  const t = useTranslations('WorkOrders');
  const tc = useTranslations('Common');
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [workstationOptions, setWorkstationOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [workOrderNo, setWorkOrderNo] = useState('');
  const [skuItemCode, setSkuItemCode] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [plannedQty, setPlannedQty] = useState('1');
  const [targetVersion, setTargetVersion] = useState('');
  const [status, setStatus] = useState<WorkOrderStatus>('PLANNED');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planEndDate, setPlanEndDate] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [notes, setNotes] = useState('');

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/work-orders', { cache: 'no-store' });
      if (!res.ok) {
        setRows([]);
        setListError(t('load_failed'));
        return;
      }
      const data = (await res.json()) as WorkOrderRow[];
      setRows(data);
      if (data.length > 0 && !selectedWorkOrderId) {
        setSelectedWorkOrderId(data[0].id);
      }
    } catch {
      setRows([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, selectedWorkOrderId]);

  const loadItemOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/items', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as ItemOption[];
      setItemOptions(
        data
          .filter((item) => item.itemType !== 'MATERIAL')
          .map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            itemType: item.itemType,
          }))
      );
    } catch {
      setItemOptions([]);
    }
  }, []);

  const loadWorkstationOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/work-centers', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{ name: string; workCenterCode: string }>;
      const options = data.flatMap((v) => [v.name, v.workCenterCode]).filter(Boolean);
      setWorkstationOptions(Array.from(new Set(options)).sort());
    } catch {
      setWorkstationOptions([]);
    }
  }, []);

  const batchOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.batchNo.trim()).filter(Boolean))).sort(),
    [rows]
  );

  const mapError = (code: string) => {
    const m: Record<string, string> = {
      WORK_ORDER_NO_INVALID: 'work_order_no_invalid',
      WORK_ORDER_NO_DUPLICATE: 'work_order_no_duplicate',
      SKU_ITEM_CODE_INVALID: 'sku_item_code_invalid',
      SKU_NOT_FOUND: 'sku_not_found',
      WORK_ORDER_SKU_TYPE_INVALID: 'work_order_sku_type_invalid',
      BATCH_NO_REQUIRED: 'batch_no_required',
      PLANNED_QTY_INVALID: 'planned_qty_invalid',
      WORK_ORDER_STATUS_INVALID: 'status_invalid',
      PLAN_DATE_INVALID: 'plan_date_invalid',
      WORK_ORDER_NOT_FOUND: 'work_order_not_found',
      WORKSTATION_REQUIRED: 'workstation_required',
      COMPLETED_QTY_INVALID: 'completed_qty_invalid',
      COMPLETED_QTY_EXCEEDS_PLANNED: 'completed_qty_exceeds_planned',
      FG_LOCATION_NOT_FOUND: 'fg_location_not_found',
      INSUFFICIENT_STOCK_FOR_ISSUE: 'insufficient_stock',
    };
    const key = m[code] || code.toLowerCase();
    return t.has(key as any) ? t(key as any) : t('save_failed');
  };

  const createWorkOrder = async () => {
    setDialogError('');
    setListError('');
    setListMessage('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNo: workOrderNo.trim().toUpperCase(),
          skuItemCode: skuItemCode.trim(),
          batchNo: batchNo.trim(),
          plannedQty: Number.parseInt(plannedQty, 10),
          targetVersion: targetVersion.trim(),
          status,
          planStartDate: planStartDate || null,
          planEndDate: planEndDate || null,
          createdBy: createdBy.trim(),
          notes: notes.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setDialogError(mapError(payload?.error ?? ''));
        return;
      }
      setDialogOpen(false);
      resetForm();
      setListMessage(t('create_success'));
      await loadRows();
      return;
    } catch {
      setDialogError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (row: WorkOrderRow, nextStatus: WorkOrderStatus) => {
    setListError('');
    setListMessage('');
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/work-orders/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setListError(mapError(payload?.error ?? ''));
        return;
      }
      setListMessage(t('update_success'));
      await loadRows();
    } catch {
      setListError(t('save_failed'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    void loadRows();
    void loadItemOptions();
    void loadWorkstationOptions();
  }, [loadRows, loadItemOptions, loadWorkstationOptions]);

  const resetForm = () => {
    setWorkOrderNo('');
    setSkuItemCode('');
    setBatchNo('');
    setPlannedQty('1');
    setTargetVersion('');
    setStatus('PLANNED');
    setPlanStartDate('');
    setPlanEndDate('');
    setCreatedBy('');
    setNotes('');
    setDialogError('');
  };

  const selectedWorkOrder = useMemo(
    () => rows.find((r) => r.id === selectedWorkOrderId) ?? null,
    [rows, selectedWorkOrderId]
  );

  const filteredRows = rows.filter(r => 
    r.workOrderNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.skuItemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusLabel = (value: WorkOrderStatus) =>
    t(`status_${value.toLowerCase()}` as Parameters<typeof t>[0]);

  const statusBadgeClass = (value: WorkOrderStatus) => {
    if (value === 'PLANNED') return 'bg-slate-100 text-slate-600';
    if (value === 'RELEASED') return 'bg-indigo-50 text-indigo-600';
    if (value === 'IN_PROGRESS') return 'bg-amber-50 text-amber-600';
    if (value === 'DONE') return 'bg-emerald-50 text-emerald-600';
    return 'bg-red-50 text-red-600';
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('center_title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => loadRows()}>
            {tc('refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('add')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ClipboardList className="size-5 text-indigo-400" />
                {t('task_pool')}
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
                ) : filteredRows.map((row) => (
                  <div 
                    key={row.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedWorkOrderId === row.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedWorkOrderId(row.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.workOrderNo}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${statusBadgeClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{row.skuItemCode}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Zap className="size-3" /> {t('qty_label')}: {row.plannedQty}
                         </p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Package className="size-3" /> {t('batch_label')}: {row.batchNo}
                         </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredRows.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('no_matching')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_console')} */}
        <div className="lg:col-span-8 space-y-8">
          {selectedWorkOrder ? (
            <>
              {/* {t('core_overview')} */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('current_status')}</label>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full animate-pulse ${selectedWorkOrder.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <p className="text-sm font-bold text-slate-900">{statusLabel(selectedWorkOrder.status)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('completion_progress')}</label>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      {/* Simple logic: completedQty of last operation / plannedQty */}
                      <div 
                        className="h-full bg-emerald-500 transition-all" 
                        style={{ 
                          width: `${Math.min(100, (selectedWorkOrder.operations.find(o => o.sequence === Math.max(...selectedWorkOrder.operations.map(op => op.sequence)))?.completedQty || 0) / selectedWorkOrder.plannedQty * 100)}%` 
                        }} 
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-500">
                      {((selectedWorkOrder.operations.find(o => o.sequence === Math.max(...selectedWorkOrder.operations.map(op => op.sequence)))?.completedQty || 0) / selectedWorkOrder.plannedQty * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-3">
                  {selectedWorkOrder.status === 'PLANNED' && (
                    <Button 
                      className="font-black text-[10px] uppercase tracking-widest bg-indigo-600" 
                      onClick={() => void updateStatus(selectedWorkOrder, 'RELEASED')}
                      disabled={isUpdatingStatus}
                    >
                      {t('btn_release')}
                    </Button>
                  )}
                  {(selectedWorkOrder.status === 'RELEASED' || selectedWorkOrder.status === 'IN_PROGRESS') && (
                    <Button 
                      variant="outline" 
                      className="font-black text-[10px] uppercase tracking-widest border-emerald-500 text-emerald-600 hover:bg-emerald-50" 
                      onClick={() => void updateStatus(selectedWorkOrder, 'DONE')}
                      disabled={isUpdatingStatus}
                    >
                      {t('btn_force_done')}
                    </Button>
                  )}
                </div>
              </div>

              {listError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{listError}</div>}
              {listMessage && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{listMessage}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Monitor className="size-4 mr-2" /> {t('tab_board')}
                  </TabsTrigger>
                  <TabsTrigger value="operations" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Settings2 className="size-4 mr-2" /> {t('tab_ops')}
                  </TabsTrigger>
                  <TabsTrigger value="details" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> {t('tab_attrs')}
                  </TabsTrigger>
                </TabsList>

                {/* {t('tab_board')} */}
                <TabsContent value="overview" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <TrendingUp className="size-4 text-indigo-600" />
                            {t('realtime_flow')}
                         </h3>
                         <div className="space-y-6">
                            {selectedWorkOrder.operations.sort((a,b) => a.sequence - b.sequence).map((op) => (
                               <div key={op.id} className="relative pl-8 pb-6 border-l-2 border-slate-50 last:border-0 last:pb-0">
                                  <div className={`absolute -left-1.5 top-0 size-3 rounded-full border-2 border-white ${op.status === 'COMPLETED' ? 'bg-emerald-500' : op.status === 'STARTED' ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'}`} />
                                  <div className="flex justify-between items-start">
                                     <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{op.operationName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{op.workstation}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-xs font-black text-slate-900">{op.completedQty} / {selectedWorkOrder.plannedQty}</p>
                                        <div className="w-24 h-1 bg-slate-50 rounded-full mt-1 overflow-hidden">
                                           <div className="h-full bg-indigo-500" style={{ width: `${(op.completedQty / selectedWorkOrder.plannedQty) * 100}%` }} />
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </Card>

                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">{t('instruction_box')}</h3>
                            <div className="space-y-4">
                               <p className="text-xs text-slate-400 leading-relaxed">
                                  {t('instruction_desc')}
                               </p>
                               <div className="pt-4 grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('used_hours')}</p>
                                     <p className="text-lg font-black italic">--:--</p>
                                  </div>
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('est_delivery')}</p>
                                     <p className="text-lg font-black italic">{selectedWorkOrder.planEndDate ? new Date(selectedWorkOrder.planEndDate).toLocaleDateString() : t('not_set')}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <LayoutGrid className="absolute -bottom-10 -right-10 size-64 text-white/5" />
                      </Card>
                   </div>
                </TabsContent>

                {/* {t('tab_ops')} */}
                <TabsContent value="operations" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_seq')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_op')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_station')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_status')}</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_output')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedWorkOrder.operations.sort((a,b) => a.sequence - b.sequence).map((op) => (
                          <TableRow key={op.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 py-4 font-black text-slate-400">{op.sequence}</TableCell>
                            <TableCell className="font-bold text-slate-900 uppercase tracking-tight">{op.operationName}</TableCell>
                            <TableCell className="font-bold text-slate-600 text-xs uppercase tracking-widest">{op.workstation}</TableCell>
                            <TableCell>
                               <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                 op.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                 op.status === 'STARTED' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                               }`}>
                                 {op.status}
                               </span>
                            </TableCell>
                            <TableCell className="text-right pr-8 font-black text-indigo-600">{op.completedQty} PCS</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* {t('tab_attrs')} */}
                <TabsContent value="details" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{t('plan_attrs')}</h3>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                               <span className="text-xs text-slate-500">{t('field_version')}</span>
                               <span className="text-xs font-black text-slate-900">{selectedWorkOrder.targetVersion || 'DEFAULT'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                               <span className="text-xs text-slate-500">{t('field_plan_qty')}</span>
                               <span className="text-xs font-black text-slate-900">{selectedWorkOrder.plannedQty} PCS</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                               <span className="text-xs text-slate-500">{t('field_start')}</span>
                               <span className="text-xs font-black text-slate-900">{selectedWorkOrder.planStartDate ? new Date(selectedWorkOrder.planStartDate).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                               <span className="text-xs text-slate-500">{t('field_end')}</span>
                               <span className="text-xs font-black text-slate-900">{selectedWorkOrder.planEndDate ? new Date(selectedWorkOrder.planEndDate).toLocaleDateString() : '-'}</span>
                            </div>
                         </div>
                      </Card>
                      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{t('mgmt_records')}</h3>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                               <span className="text-xs text-slate-500">{t('field_creator')}</span>
                               <span className="text-xs font-black text-slate-900">{selectedWorkOrder.createdBy || 'SYSTEM'}</span>
                            </div>
                            <div className="space-y-2">
                               <span className="text-xs text-slate-500">{t('field_notes')}</span>
                               <p className="text-xs font-bold text-slate-900 bg-slate-50 p-4 rounded-2xl min-h-[80px]">
                                  {selectedWorkOrder.notes || t('no_notes')}
                               </p>
                            </div>
                         </div>
                      </Card>
                   </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <ClipboardList className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* {t('dialog_create')} */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('dialog_create')}</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">{t('dialog_create_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 mt-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_wo_no')}</label>
              <Input
                placeholder="e.g. WO2024041001"
                value={workOrderNo}
                onChange={(e) => setWorkOrderNo(e.target.value.toUpperCase())}
                className="h-12 bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_sku')}</label>
              <Select
                value={skuItemCode || undefined}
                onValueChange={(v) => setSkuItemCode(v ? String(v) : '')}
              >
                <SelectTrigger className="h-12 bg-slate-50 border-none font-bold">
                  <SelectValue placeholder={t('sku_item_code')} />
                </SelectTrigger>
                <SelectContent>
                  {itemOptions.map((item) => (
                    <SelectItem key={item.itemCode} value={item.itemCode} className="font-bold">
                      {item.itemCode} - {item.itemName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_batch')}</label>
              <Input
                placeholder="BATCH-2024-01"
                list="work-order-batch-options"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="h-12 bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_plan_qty')}</label>
                <Input
                  placeholder="100"
                  value={plannedQty}
                  inputMode="numeric"
                  onChange={(e) => setPlannedQty(e.target.value)}
                  className="h-12 bg-slate-50 border-none font-black text-center"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_target_version')}</label>
                <Input
                  placeholder="V1.0"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  className="h-12 bg-slate-50 border-none font-bold text-center"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_start')}</label>
              <Input
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
                className="h-12 bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_end')}</label>
              <Input
                type="date"
                value={planEndDate}
                onChange={(e) => setPlanEndDate(e.target.value)}
                className="h-12 bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tc('remarks')}</label>
              <Input
                placeholder={t('field_notes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 bg-slate-50 border-none font-bold"
              />
            </div>
          </div>
          {dialogError && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-4">{dialogError}</p>}
          <div className="flex gap-4 mt-8">
             <Button variant="outline" className="flex-1 h-14 font-black rounded-2xl" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
             <Button 
               className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100" 
               onClick={() => void createWorkOrder()}
               disabled={isSubmitting}
             >
               {isSubmitting ? tc('submitting') : t('btn_confirm_publish')}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


