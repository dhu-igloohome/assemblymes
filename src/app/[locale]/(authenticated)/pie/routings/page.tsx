'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  GitBranch, 
  Workflow, 
  Plus, 
  Save, 
  CheckCircle2, 
  History, 
  ArrowRight, 
  Trash2, 
  Search,
  Monitor,
  ShieldCheck,
  Clock,
  Zap,
  ArrowDown
} from 'lucide-react';

interface Item {
  itemCode: string;
  itemName: string;
}

interface OperationLine {
  sequence: number;
  operationName: string;
  workstation: string;
  standardTimeSec: number;
  isInspectionPoint: boolean;
  inspectionStandard: string;
  sopUrl: string;
}

interface ExistingRoutingRecord {
  id: string;
  itemCode: string;
  version: string;
  effectiveDate: string | null;
  changeNote: string | null;
  createdBy: string | null;
  updatedAt: string;
  item: {
    itemName: string;
  };
  _count: {
    operations: number;
  };
}

interface RoutingSuggestions {
  operationNames: string[];
}

interface WorkCenter {
  id: string;
  workCenterCode: string;
  name: string;
}

export default function RoutingsPage() {
  const t = useTranslations('Routings');
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [version, setVersion] = useState('V1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [operations, setOperations] = useState<OperationLine[]>([]);
  const [existingRoutings, setExistingRoutings] = useState<ExistingRoutingRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RoutingSuggestions>({
    operationNames: [],
  });
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isLoadingExistingList, setIsLoadingExistingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('operations');

  const loadExistingRoutings = useCallback(async () => {
    setIsLoadingExistingList(true);
    try {
      const res = await fetch('/api/routings?mode=list', { cache: 'no-store' });
      if (!res.ok) {
        setExistingRoutings([]);
        return;
      }
      const data = (await res.json()) as ExistingRoutingRecord[];
      setExistingRoutings(data);
    } catch (error) {
      console.error(error);
      setExistingRoutings([]);
    } finally {
      setIsLoadingExistingList(false);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/routings?mode=suggestions', { cache: 'no-store' });
      if (!res.ok) {
        setSuggestions({ operationNames: [] });
        return;
      }
      const data = (await res.json()) as RoutingSuggestions;
      setSuggestions({
        operationNames: Array.from(new Set(data.operationNames.map((v) => v.trim()).filter(Boolean))),
      });
    } catch {
      setSuggestions({ operationNames: [] });
    }
  }, []);

  const loadWorkCenters = useCallback(async () => {
    try {
      const res = await fetch('/api/work-centers', { cache: 'no-store' });
      if (!res.ok) {
        setWorkCenters([]);
        return;
      }
      const data = (await res.json()) as WorkCenter[];
      setWorkCenters(data);
    } catch {
      setWorkCenters([]);
    }
  }, []);

  const loadRouting = useCallback(async (code: string | null) => {
    if (!code) return;
    setItemCode(code);
    try {
      const res = await fetch(`/api/routings?itemCode=${code}`);
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        setEffectiveDate(data.effectiveDate ? String(data.effectiveDate).slice(0, 10) : '');
        setChangeNote(data.changeNote ?? '');
        setCreatedBy(data.createdBy ?? '');
        setOperations(
          data.operations.map(
            (o: {
              sequence: number;
              operationName: string;
              workstation: string;
              standardTimeSec: number;
              isInspectionPoint?: boolean;
              inspectionStandard?: string | null;
              sopUrl?: string | null;
            }) => ({
              sequence: o.sequence,
              operationName: o.operationName,
              workstation: o.workstation,
              standardTimeSec: o.standardTimeSec,
              isInspectionPoint: o.isInspectionPoint ?? false,
              inspectionStandard: o.inspectionStandard ?? '',
              sopUrl: o.sopUrl ?? '',
            })
          )
        );
      } else {
        setOperations([]);
      }
    } catch (error) {
      console.error(error);
      setOperations([]);
    }
  }, []);

  useEffect(() => {
    void loadExistingRoutings();
  }, [loadExistingRoutings]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    void loadWorkCenters();
  }, [loadWorkCenters]);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data: Item[]) => {
        setItems(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const initialItemCode = searchParams.get('itemCode');
    if (!initialItemCode || items.length === 0) {
      return;
    }
    const exists = items.some((item) => item.itemCode === initialItemCode);
    if (!exists) {
      return;
    }
    void loadRouting(initialItemCode);
  }, [searchParams, items, loadRouting]);

  const handleAddOperation = () => {
    setOperations([
      ...operations,
      {
        sequence: (operations.length + 1) * 10,
        operationName: '',
        workstation: '',
        standardTimeSec: 60,
        isInspectionPoint: false,
        inspectionStandard: '',
        sopUrl: '',
      },
    ]);
  };

  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const updateOperation = (
    index: number,
    field: keyof OperationLine,
    value: string | number | boolean
  ) => {
    const newOps = [...operations];
    newOps[index] = { ...newOps[index], [field]: value };
    setOperations(newOps);
  };

  const handleSave = async () => {
    if (!itemCode) {
      return;
    }
    setSubmitMessage('');
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode,
          version,
          effectiveDate,
          changeNote,
          createdBy,
          operations,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { details?: string; error?: string } | null;
        const code = payload?.error;
        const codeToMessage: Record<string, string> = {
          ITEM_CODE_INVALID: t('save_failed'),
          VERSION_REQUIRED: t('save_failed'),
          OPERATIONS_INVALID: t('save_failed'),
          ROUTING_SAVE_FAILED: t('save_failed'),
          WORKSTATION_NOT_FOUND: t('workstation_not_found'),
        };
        setSubmitError(payload?.details ?? (code && codeToMessage[code]) ?? t('save_failed'));
        return;
      }
      setSubmitMessage(t('save_success'));
      await loadExistingRoutings();
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? `${t('save_failed')} ${error.message}` : t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRoutings = existingRoutings.filter(r => 
    r.itemCode.includes(searchQuery) || 
    r.item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadExistingRoutings()}>
            {t('btn_refresh_list')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => void handleSave()} disabled={!itemCode || isSubmitting}>
            <Save className="size-4 mr-2" /> {isSubmitting ? t('submitting') : t('btn_publish_routing')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Workflow className="size-5 text-indigo-400" />
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
                {isLoadingExistingList ? (
                   <div className="p-12 text-center text-slate-400 italic">{t('Common.loading')}</div>
                ) : filteredRoutings.map((record) => (
                  <div 
                    key={record.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${itemCode === record.itemCode ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => void loadRouting(record.itemCode)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {record.itemCode}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter flex items-center gap-1">
                        <GitBranch className="size-3" /> {record.version}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{record.item.itemName}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Monitor className="size-3" /> {record._count.operations} {t('col_ops_count')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{t('col_last_update')}: {new Date(record.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {filteredRoutings.length === 0 && !isLoadingExistingList && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('no_matching')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_designer')} */}
        <div className="lg:col-span-8 space-y-8">
          {itemCode ? (
            <>
              {/* {t('config_area')} */}
              <div className="grid gap-4 md:grid-cols-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('label_current_design')}</label>
                  <p className="text-sm font-bold text-slate-900">{items.find(i => i.itemCode === itemCode)?.itemName}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_version_no')}</label>
                  <Input 
                    value={version} 
                    onChange={(e) => setVersion(e.target.value)}
                    className="h-10 bg-slate-50 border-none font-bold text-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_effective_date')}</label>
                  <Input 
                    type="date"
                    value={effectiveDate} 
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="h-10 bg-slate-50 border-none font-bold"
                  />
                </div>
              </div>

              {submitError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{submitError}</div>}
              {submitMessage && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{submitMessage}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="operations" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Monitor className="size-4 mr-2" /> {t('tab_ops_detail')}
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Workflow className="size-4 mr-2" /> {t('tab_visual_preview')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="operations" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('card_ops_steps')}</h3>
                       <Button size="sm" variant="ghost" className="text-indigo-600 font-bold" onClick={handleAddOperation}>
                         <Plus className="size-4 mr-1" /> {t('btn_add_op')}
                       </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest w-20">{t('col_seq')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_op_name')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_wc')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-32">{t('col_std_time')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_qc_point')}</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('Common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operations.map((op, idx) => (
                          <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 py-4">
                               <Input 
                                 type="number" 
                                 value={op.sequence} 
                                 onChange={(e) => updateOperation(idx, 'sequence', Number(e.target.value))}
                                 className="w-16 h-9 bg-slate-50 border-none font-black text-center"
                               />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 min-w-[160px]">
                                <datalist id={`op-name-${idx}`}>
                                  {suggestions.operationNames.map(n => <option key={n} value={n} />)}
                                </datalist>
                                <Input 
                                  list={`op-name-${idx}`}
                                  value={op.operationName}
                                  onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                                  className="bg-slate-50 border-none font-bold text-xs h-9"
                                  placeholder={t('field_op_placeholder')}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={op.workstation || null}
                                onValueChange={(v) => updateOperation(idx, 'workstation', v || '')}
                              >
                                <SelectTrigger className="h-9 bg-slate-50 border-none text-[10px] font-black uppercase w-40">
                                  <SelectValue placeholder={t('select_wc')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {workCenters.map((wc) => (
                                    <SelectItem key={wc.id} value={wc.workCenterCode} className="text-xs font-bold uppercase">
                                      {wc.workCenterCode}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                               <Input 
                                 type="number" 
                                 value={op.standardTimeSec} 
                                 onChange={(e) => updateOperation(idx, 'standardTimeSec', Number(e.target.value))}
                                 className="w-20 h-9 bg-slate-50 border-none font-black text-center"
                               />
                            </TableCell>
                            <TableCell>
                               <button 
                                 onClick={() => updateOperation(idx, 'isInspectionPoint', !op.isInspectionPoint)}
                                 className={`size-8 rounded-xl flex items-center justify-center transition-all ${op.isInspectionPoint ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-300'}`}
                               >
                                 <ShieldCheck className="size-4" />
                               </button>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                               <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => removeOperation(idx)}>
                                 <Trash2 className="size-4" />
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="visual">
                   <Card className="border-none shadow-sm rounded-[40px] p-12 bg-white overflow-hidden">
                      <div className="flex flex-col items-center space-y-8">
                         {operations.length === 0 ? (
                            <div className="py-20 text-center">
                               <Zap className="size-16 text-slate-100 mx-auto mb-4" />
                               <p className="text-sm font-black text-slate-300 uppercase italic">{t('visual_empty')}</p>
                            </div>
                         ) : operations.sort((a, b) => a.sequence - b.sequence).map((op, i) => (
                            <div key={i} className="flex flex-col items-center space-y-8 w-full max-w-md">
                               <div className="relative group w-full">
                                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border-4 border-slate-800 transition-all hover:scale-105 hover:bg-indigo-900 hover:border-indigo-800">
                                     <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 rounded uppercase">{t('visual_step')} {i + 1}</span>
                                        <div className="flex gap-2">
                                          <Clock className="size-4 text-slate-500" />
                                          <span className="text-xs font-black">{op.standardTimeSec}s</span>
                                        </div>
                                     </div>
                                     <h4 className="text-lg font-black uppercase tracking-tight">{op.operationName || t('visual_unnamed')}</h4>
                                     <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{op.workstation || t('visual_unassigned')}</p>
                                     
                                     {op.isInspectionPoint && (
                                       <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                                          <ShieldCheck className="size-3" /> {t('visual_qc_point')}
                                       </div>
                                     )}
                                  </div>
                               </div>
                               {i < operations.length - 1 && (
                                 <ArrowDown className="size-6 text-slate-200 animate-bounce" />
                               )}
                            </div>
                         ))}
                      </div>
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <Workflow className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
