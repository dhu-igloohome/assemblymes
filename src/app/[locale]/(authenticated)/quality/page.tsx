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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, Activity, BarChart3, Search, CheckCircle2, XCircle, Package } from 'lucide-react';

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
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState('');
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
    setListError('');
    try {
      const res = await fetch('/api/quality/inspections', { cache: 'no-store' });
      if (!res.ok) {
        setRows([]);
        setListError(t('load_failed'));
        return;
      }
      const data = (await res.json()) as InspectionRow[];
      setRows(data);
    } catch {
      setRows([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

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
    setListError('');
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
      setMessage(t('create_success'));
      await loadRows();
    } catch {
      setFormError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-8 bg-slate-50/50 min-h-screen">
      {/* {t('header_area')} */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('center_title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200">
            {t('btn_export_daily')}
          </Button>
          <Button className="font-bold bg-indigo-600">
            {t('btn_add_record')}
          </Button>
        </div>
      </div>

      {/* {t('quick_overview')} */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2 border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-slate-500 uppercase flex justify-between">
              {t('stat_yield_title')}
              <ShieldCheck className="size-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">98.5%</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{t('stat_yield_compare', { change: '+0.2%' })}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-slate-500 uppercase flex justify-between">
              {t('stat_pending_title')}
              <AlertTriangle className="size-4 text-red-500 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">3</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{t('stat_pending_desc')}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-slate-500 uppercase flex justify-between">
              {t('stat_defect_title')}
              <BarChart3 className="size-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-800 truncate">{t('top_defect_reason')}</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{t('stat_defect_desc')} 45%</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-slate-500 uppercase flex justify-between">
              {t('stat_task_title')}
              <Activity className="size-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">12 / 20</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{t('stat_task_desc')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* {t('left_quick_reg')} */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">{t('card_quick_reg')}</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_doc_no')}</label>
                <Input
                  className="bg-slate-50 border-none font-mono font-bold h-12"
                  placeholder={t('field_doc_no_placeholder')}
                  value={inspectionNo}
                  onChange={(e) => setInspectionNo(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_stage')}</label>
                  <select
                    className="w-full h-12 rounded-xl border-none bg-slate-50 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as InspectionStage)}
                  >
                    {STAGES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_result')}</label>
                  <select
                    className={`w-full h-12 rounded-xl border-none px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 ${
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
                    className="bg-slate-50 border-none pl-10 font-bold h-12" 
                    placeholder={t('field_wo_batch_placeholder')} 
                    value={workOrderNo} 
                    onChange={(e) => setWorkOrderNo(e.target.value)} 
                  />
                  <Search className="absolute left-3 top-3.5 size-4 text-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_defect_qty')}</label>
                  <Input
                    className="bg-slate-50 border-none font-bold h-12 text-lg"
                    type="number"
                    value={defectQty}
                    onChange={(e) => setDefectQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_disposition')}</label>
                  <Input
                    className="bg-slate-50 border-none font-bold h-12"
                    placeholder={t('field_disposition_placeholder')}
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-lg shadow-indigo-100 rounded-2xl" disabled={isSubmitting} onClick={() => void handleSubmit()}>
                  {isSubmitting ? t('submitting') : t('btn_confirm_publish')}
                </Button>
                {formError && <p className="text-center text-xs text-red-600 font-bold">{formError}</p>}
                {message && <p className="text-center text-xs text-emerald-600 font-bold">{message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* {t('right_board')} */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('card_history')}</h2>
               <div className="flex gap-2">
                  <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Real-time update</span>
               </div>
            </div>
            
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                    <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_status')}</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_details')}</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_defect')}</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_inspector')}</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="pl-8 py-5">
                        {row.result === 'PASS' ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                            <CheckCircle2 className="size-4" /> {t('result_pass')}
                          </div>
                        ) : row.result === 'FAIL' ? (
                          <div className="flex items-center gap-2 text-red-600 font-black text-xs">
                            <XCircle className="size-4" /> {t('result_fail')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
                            <Activity className="size-4" /> {t('result_pending')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900">{row.inspectionNo}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{row.stage} / {row.workOrderNo || row.batchNo || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${row.defectQty > 0 ? 'bg-red-50 text-red-600' : 'text-slate-400'}`}>
                          {row.defectQty} PCS
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{row.inspectedBy || t('system_auto')}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="sm" className="font-black text-indigo-600 hover:bg-indigo-50">
                          {t('col_actions')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <Package className="size-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-xs text-slate-400 font-black uppercase italic">{t('empty')}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
