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
    <div className="space-y-6 p-8 md:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('description')}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Input
            placeholder={t('inspection_no')}
            value={inspectionNo}
            onChange={(e) => setInspectionNo(e.target.value.toUpperCase())}
          />
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={stage}
            onChange={(e) => setStage(e.target.value as InspectionStage)}
          >
            {STAGES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={result}
            onChange={(e) => setResult(e.target.value as InspectionResult)}
          >
            {RESULTS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <Input placeholder={t('item_code')} value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <Input placeholder={t('batch_no')} value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          <Input
            placeholder={t('work_order_no')}
            value={workOrderNo}
            onChange={(e) => setWorkOrderNo(e.target.value)}
          />
          <Input
            placeholder={t('sample_size')}
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
          />
          <Input
            placeholder={t('defect_qty')}
            value={defectQty}
            onChange={(e) => setDefectQty(e.target.value)}
          />
          <Input
            placeholder={t('inspected_by')}
            value={inspectedBy}
            onChange={(e) => setInspectedBy(e.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Textarea
            placeholder={t('issue_summary')}
            value={issueSummary}
            onChange={(e) => setIssueSummary(e.target.value)}
          />
          <Textarea
            placeholder={t('disposition')}
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
          />
        </div>

        {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}

        <Button className="mt-4" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? t('submitting') : t('create')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('list_title')}</h2>
        {listError ? <p className="mt-2 text-sm text-red-600">{listError}</p> : null}
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspection_no')}</TableHead>
                  <TableHead>{t('stage')}</TableHead>
                  <TableHead>{t('result')}</TableHead>
                  <TableHead>{t('item_code')}</TableHead>
                  <TableHead>{t('batch_no')}</TableHead>
                  <TableHead>{t('sample_size')}</TableHead>
                  <TableHead>{t('defect_qty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.inspectionNo}</TableCell>
                    <TableCell>{row.stage}</TableCell>
                    <TableCell>{row.result}</TableCell>
                    <TableCell>{row.itemCode || '—'}</TableCell>
                    <TableCell>{row.batchNo || '—'}</TableCell>
                    <TableCell>{row.sampleSize}</TableCell>
                    <TableCell>{row.defectQty}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
