'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/planning/overview', { cache: 'no-store' });
      if (!res.ok) {
        setData(null);
        setError(t('load_failed'));
        return;
      }
      const payload = (await res.json()) as OverviewResponse;
      setData(payload);
    } catch {
      setData(null);
      setError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-8 md:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('description')}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('loading')}</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label={t('metric_work_orders')} value={data?.summary.workOrderCount ?? 0} />
            <MetricCard label={t('metric_shortage')} value={data?.summary.shortageCount ?? 0} />
            <MetricCard label={t('metric_safety_warnings')} value={data?.summary.safetyWarningCount ?? 0} />
            <MetricCard label={t('metric_overloaded_centers')} value={data?.summary.overloadedCenterCount ?? 0} />
          </div>

          <Panel title={t('shortage_title')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('work_order_no')}</TableHead>
                  <TableHead>{t('sku_item_code')}</TableHead>
                  <TableHead>{t('planned_qty')}</TableHead>
                  <TableHead>{t('available_qty')}</TableHead>
                  <TableHead>{t('shortage_qty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.shortage ?? []).map((row) => (
                  <TableRow key={`${row.workOrderNo}-${row.skuItemCode}`}>
                    <TableCell>{row.workOrderNo}</TableCell>
                    <TableCell>{row.skuItemCode}</TableCell>
                    <TableCell>{row.plannedQty}</TableCell>
                    <TableCell>{row.availableQty}</TableCell>
                    <TableCell className="text-red-600">{row.shortageQty}</TableCell>
                  </TableRow>
                ))}
                {(data?.shortage.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Panel>

          <Panel title={t('capacity_title')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('work_center')}</TableHead>
                  <TableHead>{t('daily_capacity_hours')}</TableHead>
                  <TableHead>{t('planned_load_hours')}</TableHead>
                  <TableHead>{t('utilization')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.capacity ?? []).map((row) => (
                  <TableRow key={row.workCenterCode}>
                    <TableCell>{row.workCenterCode} - {row.name}</TableCell>
                    <TableCell>{row.dailyCapacityHours}</TableCell>
                    <TableCell>{row.plannedLoadHours}</TableCell>
                    <TableCell className={row.utilizationPct > 100 ? 'text-amber-600' : ''}>
                      {row.utilizationPct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </>
      )}
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
