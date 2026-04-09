'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [entries, setEntries] = useState<CostEntryRow[]>([]);
  const [summary, setSummary] = useState<CostSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

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
    } catch {
      setEntries([]);
      setSummary([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
      await loadData();
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

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Input placeholder={t('work_order_no_optional')} value={workOrderNo} onChange={(e) => setWorkOrderNo(e.target.value)} />
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as CostEntryType)}
          >
            {ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`entry_type_${type.toLowerCase()}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <Input placeholder={t('amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={t('currency')} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Input placeholder={t('source_type')} value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
          <Input placeholder={t('source_ref')} value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
          <Input placeholder={t('created_by')} value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          <Input placeholder={t('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}

        <Button className="mt-4" disabled={isSubmitting} onClick={() => void createEntry()}>
          {isSubmitting ? t('submitting') : t('create_entry')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('summary_title')}</h2>
        {listError ? <p className="mt-2 text-sm text-red-600">{listError}</p> : null}
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('work_order_no')}</TableHead>
                  <TableHead>{t('sku_item_code')}</TableHead>
                  <TableHead>{t('batch_no')}</TableHead>
                  <TableHead>{t('material_cost')}</TableHead>
                  <TableHead>{t('labor_cost')}</TableHead>
                  <TableHead>{t('overhead_cost')}</TableHead>
                  <TableHead>{t('adjustment_cost')}</TableHead>
                  <TableHead>{t('total_cost')}</TableHead>
                  <TableHead>{t('unit_cost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.workOrderNo}>
                    <TableCell className="font-medium">{row.workOrderNo}</TableCell>
                    <TableCell>{row.skuItemCode}</TableCell>
                    <TableCell>{row.batchNo}</TableCell>
                    <TableCell>{row.materialCost.toFixed(2)}</TableCell>
                    <TableCell>{row.laborCost.toFixed(2)}</TableCell>
                    <TableCell>{row.overheadCost.toFixed(2)}</TableCell>
                    <TableCell>{row.adjustmentCost.toFixed(2)}</TableCell>
                    <TableCell>{row.totalCost.toFixed(2)}</TableCell>
                    <TableCell>{row.unitCost.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-slate-500">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('entries_title')}</h2>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('entry_type')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('currency')}</TableHead>
                <TableHead>{t('work_order_no')}</TableHead>
                <TableHead>{t('source_ref')}</TableHead>
                <TableHead>{t('created_by')}</TableHead>
                <TableHead>{t('created_at')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{t(`entry_type_${row.entryType.toLowerCase()}` as Parameters<typeof t>[0])}</TableCell>
                  <TableCell>{Number(row.amount).toFixed(2)}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell>{row.workOrder?.workOrderNo || '—'}</TableCell>
                  <TableCell>{row.sourceRef || '—'}</TableCell>
                  <TableCell>{row.createdBy || '—'}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
