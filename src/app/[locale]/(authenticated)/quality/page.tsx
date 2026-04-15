'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, Activity, BarChart3, Search, CheckCircle2, XCircle, Package, ArrowRight, Zap, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type InspectionStage = 'IQC' | 'IPQC' | 'OQC';
type InspectionResult = 'PENDING' | 'PASS' | 'FAIL';

interface InspectionRow {
  id: string;
  inspectionNo: string;
  stage: InspectionStage;
  result: InspectionResult;
  itemCode: string | null;
  batchNo: string | null;
  workOrderNo: string | null;
  sampleSize: number;
  defectQty: number;
  issueSummary: string | null;
  disposition: string | null;
  inspectedBy: string | null;
  inspectedAt: string | null;
}

const STAGES: InspectionStage[] = ['IQC', 'IPQC', 'OQC'];
const RESULTS: InspectionResult[] = ['PENDING', 'PASS', 'FAIL'];

export default function QualityPage() {
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');
  
  const [activeTab, setActiveTab] = useState('records');
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  const [inspectionNo, setInspectionNo] = useState('');
  const [stage, setStage] = useState<InspectionStage>('IQC');
  const [result, setResult] = useState<InspectionResult>('PENDING');
  const [itemCode, setItemCode] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [sampleSize, setSampleSize] = useState('0');
  const [defectQty, setDefectQty] = useState('0');
  const [issueSummary, setIssueSummary] = useState('');
  const [disposition, setDisposition] = useState('');
  const [inspectedBy, setInspectedBy] = useState('');

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/quality/inspections', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/quality/analytics', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      setAnalytics(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
    void loadAnalytics();
  }, [loadRows, loadAnalytics]);

  const mapError = (code: string) => {
    const map: Record<string, string> = {
      INSPECTION_NO_INVALID: 'inspection_no_invalid',
      INSPECTION_NO_DUPLICATE: 'inspection_no_duplicate',
      INSPECTION_STAGE_INVALID: 'stage_invalid',
      INSPECTION_RESULT_INVALID: 'result_invalid',
      SAMPLE_SIZE_INVALID: 'sample_size_invalid',
      DEFECT_QTY_INVALID: 'defect_qty_invalid',
      DEFECT_QTY_EXCEEDS_SAMPLE: 'defect_exceeds_sample',
    };
    return map[code] ? t(map[code]) : t('save_failed');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      const res = await fetch('/api/quality/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectionNo,
          stage,
          result,
          itemCode,
          batchNo,
          workOrderNo,
          sampleSize: Number.parseInt(sampleSize, 10),
          defectQty: Number.parseInt(defectQty, 10),
          issueSummary,
          disposition,
          inspectedBy,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFormError(mapError(payload?.error ?? ''));
        return;
      }
      setInspectionNo('');
      setItemCode('');
      setBatchNo('');
      setWorkOrderNo('');
      setSampleSize('0');
      setDefectQty('0');
      setIssueSummary('');
      setDisposition('');
      setInspectedBy('');
      setMessage(tc('success'));
      await loadRows();
    } catch {
      setFormError(tc('failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-8 bg-slate-50/50 min-h-screen">
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="size-8 text-indigo-600" />
            {t('center_title')}
          </h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadAnalytics()}>
            <Activity className="size-4 mr-2" />
            {tc('refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100">
            {t('btn_add_record')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-200/50 p-1 rounded-2xl">
          <TabsTrigger value="records" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
            <Package className="size-4 mr-2" />
            {t('right_board').split(':')[1] || 'Records'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
            <BarChart3 className="size-4 mr-2" />
            {t('analytics_title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-8 animate-in fade-in duration-500">
          {/* Quick Overview Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-2 border-emerald-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-emerald-50/30">
                <CardTitle className="text-[10px] font-black text-emerald-700 uppercase flex justify-between tracking-widest">
                  {t('yield_rate')}
                  <ShieldCheck className="size-4" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-emerald-600">{analytics?.yieldRate || '99.2'}%</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Live Factory Yield</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-red-50/30">
                <CardTitle className="text-[10px] font-black text-red-700 uppercase flex justify-between tracking-widest">
                  {t('total_scrap')}
                  <AlertTriangle className="size-4 animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-red-600">{analytics?.totalScrap || '0'}</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Units Scrapped</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-indigo-50/30">
                <CardTitle className="text-[10px] font-black text-indigo-700 uppercase flex justify-between tracking-widest">
                  {t('recent_7_days')}
                  <Activity className="size-4" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-indigo-600">{analytics?.recentTrend || '0'}</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Alerts Reported</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-slate-50">
                <CardTitle className="text-[10px] font-black text-slate-500 uppercase flex justify-between tracking-widest">
                  {t('stat_task_title')}
                  <Zap className="size-4" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-slate-900">{rows.length}</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Inspection Log Size</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: Quick Registration */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
                <h2 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-tight flex items-center gap-2">
                  <Zap className="size-5 text-indigo-500" />
                  {t('card_quick_reg')}
                </h2>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_doc_no')}</label>
                    <Input
                      className="bg-slate-50 border-slate-100 font-mono font-bold h-12 rounded-xl"
                      placeholder={t('field_doc_no_placeholder')}
                      value={inspectionNo}
                      onChange={(e) => setInspectionNo(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_stage')}</label>
                      <select
                        className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        value={stage}
                        onChange={(e) => setStage(e.target.value as InspectionStage)}
                      >
                        {STAGES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_result')}</label>
                      <select
                        className={`w-full h-12 rounded-xl border border-slate-100 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 ${
                          result === 'PASS' ? 'bg-emerald-50 text-emerald-700' : result === 'FAIL' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-900'
                        }`}
                        value={result}
                        onChange={(e) => setResult(e.target.value as InspectionResult)}
                      >
                        {RESULTS.map((entry) => <option key={entry} value={entry}>{t(`result_${entry.toLowerCase()}` as any)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_wo_batch')}</label>
                    <div className="relative">
                      <Input 
                        className="bg-slate-50 border-slate-100 pl-10 font-bold h-12 rounded-xl" 
                        placeholder={t('field_wo_batch_placeholder')} 
                        value={workOrderNo} 
                        onChange={(e) => setWorkOrderNo(e.target.value)} 
                      />
                      <Search className="absolute left-3 top-4 size-4 text-slate-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_defect_qty')}</label>
                      <Input
                        className="bg-slate-50 border-slate-100 font-bold h-12 text-lg rounded-xl"
                        type="number"
                        value={defectQty}
                        onChange={(e) => setDefectQty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_disposition')}</label>
                      <Input
                        className="bg-slate-50 border-slate-100 font-bold h-12 rounded-xl"
                        placeholder={t('field_disposition_placeholder')}
                        value={disposition}
                        onChange={(e) => setDisposition(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-xl shadow-indigo-100 rounded-[24px]" disabled={isSubmitting} onClick={() => void handleSubmit()}>
                      {isSubmitting ? tc('submitting') : tc('save')}
                    </Button>
                    {message && <p className="text-center text-xs text-emerald-600 font-bold animate-bounce">{message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: History Board */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-8 py-6 border-b border-white/5 flex justify-between items-center text-white">
                   <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                     <History className="size-4 text-indigo-400" />
                     {t('card_history')}
                   </h2>
                   <div className="flex gap-2 items-center">
                      <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Live Monitor</span>
                   </div>
                </div>
                
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                        <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_status')}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_details')}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_defect')}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_inspector')}</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                          <TableCell className="pl-8 py-5">
                            {row.result === 'PASS' ? (
                              <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-tight">
                                <CheckCircle2 className="size-4" /> {t('result_pass')}
                              </div>
                            ) : row.result === 'FAIL' ? (
                              <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-tight">
                                <XCircle className="size-4" /> {t('result_fail')}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-tight">
                                <Activity className="size-4" /> {t('result_pending')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{row.inspectionNo}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{row.stage} / {row.workOrderNo || row.batchNo || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${row.defectQty > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-400'}`}>
                              {row.defectQty} PCS
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{row.inspectedBy || 'System'}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="sm" className="font-black text-indigo-600 hover:bg-indigo-50 text-[10px] uppercase tracking-widest">
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="animate-in slide-in-from-right-4 duration-500">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Workstation Hotspots */}
            <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
              <CardHeader className="pb-6 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Activity className="size-5 text-indigo-500" />
                  {t('issue_heat')}
                </CardTitle>
                <CardDescription>Identifying workstations with highest failure rates.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                {(analytics?.issuesByWorkCenter || []).sort((a: any, b: any) => b.count - a.count).map((wc: any) => (
                  <div key={wc.code} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{wc.code}</span>
                      <span className="text-xs font-black text-indigo-600">{wc.count} ISSUES</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (wc.count / (analytics?.issuesByWorkCenter[0]?.count || 1)) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {(!analytics?.issuesByWorkCenter?.length) && (
                  <div className="py-20 text-center text-slate-400 italic text-xs uppercase font-black">
                     No anomalies detected at workstations yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issue Category Pie (Simplified as list with percentages) */}
            <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-slate-900 text-white">
              <CardHeader className="pb-6 border-b border-white/5">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-400" />
                  {t('issue_types')}
                </CardTitle>
                <CardDescription className="text-slate-400">Root cause distribution across the factory.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-4">
                {(analytics?.issuesByType || []).map((type: any) => {
                  const total = analytics.issuesByType.reduce((sum: number, t: any) => sum + t.count, 0);
                  const pct = Math.round((type.count / total) * 100);
                  return (
                    <div key={type.type} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`size-3 rounded-full ${type.type === 'QUALITY' ? 'bg-red-400' : 'bg-indigo-400'}`} />
                        <span className="text-xs font-black uppercase tracking-widest">{type.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black">{pct}%</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{type.count} Cases</span>
                      </div>
                    </div>
                  );
                })}
                {(!analytics?.issuesByType?.length) && (
                  <div className="py-20 text-center text-slate-500 italic text-xs uppercase font-black">
                     Zero issues reported. Factory status: OK.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
