'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    } catch {
      setRows([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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

  const statusLabel = (value: WorkOrderStatus) =>
    t(`status_${value.toLowerCase()}` as Parameters<typeof t>[0]);

  const statusBadgeClass = (value: WorkOrderStatus) => {
    if (value === 'PLANNED') return 'bg-gray-100 text-gray-700';
    if (value === 'RELEASED') return 'bg-blue-100 text-blue-700';
    if (value === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700';
    if (value === 'DONE') return 'bg-green-100 text-green-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          {t('add')}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('dialog_create')}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              placeholder={t('work_order_no')}
              value={workOrderNo}
              onChange={(e) => setWorkOrderNo(e.target.value.toUpperCase())}
            />
            <Select
              value={skuItemCode || undefined}
              onValueChange={(v) => setSkuItemCode(v ? String(v) : '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('sku_item_code')} />
              </SelectTrigger>
              <SelectContent>
                {itemOptions.map((item) => (
                  <SelectItem key={item.itemCode} value={item.itemCode}>
                    {item.itemCode} - {item.itemName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={t('batch_no')}
              list="work-order-batch-options"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
            />
            <datalist id="work-order-batch-options">
              {batchOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <Input
              placeholder={t('planned_qty')}
              value={plannedQty}
              inputMode="numeric"
              onChange={(e) => setPlannedQty(e.target.value)}
            />
            <Input
              placeholder={t('target_version')}
              value={targetVersion}
              onChange={(e) => setTargetVersion(e.target.value)}
            />
            <Select
              value={status}
              onValueChange={(v) => setStatus((v ?? 'PLANNED') as WorkOrderStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_STATUS_OPTIONS.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {statusLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder={t('plan_start_date')}
              value={planStartDate}
              onChange={(e) => setPlanStartDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder={t('plan_end_date')}
              value={planEndDate}
              onChange={(e) => setPlanEndDate(e.target.value)}
            />
            <Input
              placeholder={t('created_by')}
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
            />
            <Input
              placeholder={t('notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => void createWorkOrder()}
            >
              {isSubmitting ? t('submitting') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {listMessage ? <p className="text-sm text-green-600">{listMessage}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('work_order_no')}</TableHead>
                <TableHead>{t('sku_item_code')}</TableHead>
                <TableHead>{t('batch_no')}</TableHead>
                <TableHead>{t('planned_qty')}</TableHead>
                <TableHead>{t('target_version')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="w-64">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.workOrderNo}</TableCell>
                  <TableCell>{row.skuItemCode}</TableCell>
                  <TableCell>{row.batchNo}</TableCell>
                  <TableCell>{row.plannedQty}</TableCell>
                  <TableCell>{row.targetVersion || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        statusBadgeClass(row.status),
                      ].join(' ')}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isUpdatingStatus || row.status !== 'PLANNED'}
                        onClick={() => void updateStatus(row, 'RELEASED')}
                      >
                        {t('action_release')}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isUpdatingStatus || row.status === 'DONE' || row.status === 'CANCELLED'}
                        onClick={() => void updateStatus(row, 'DONE')}
                      >
                        {t('action_finish')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}


