'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExecutionStage, ExecutionStatus, ExecutionTaskType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ExecutionTaskRow {
  id: string;
  skuItemCode: string;
  batchNo: string;
  serialNo: string;
  bluetoothId: string;
  taskType: ExecutionTaskType;
  stage: ExecutionStage;
  status: ExecutionStatus;
  failReason: string | null;
  assignee: string | null;
}

const TASK_TYPES: ExecutionTaskType[] = ['DFU', 'FLASH_REWORK', 'BIND_VERIFY'];
const STAGES: ExecutionStage[] = ['PCBA', 'ASSEMBLY_EOL', 'FINISHED_GOODS'];
const INITIAL_STATUSES: ExecutionStatus[] = ['READY', 'NEED_DFU', 'BLOCKED'];

export default function ExecutionPage() {
  const t = useTranslations('Execution');
  const [rows, setRows] = useState<ExecutionTaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [skuItemCode, setSkuItemCode] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [bluetoothId, setBluetoothId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [taskType, setTaskType] = useState<ExecutionTaskType>('DFU');
  const [stage, setStage] = useState<ExecutionStage>('ASSEMBLY_EOL');
  const [status, setStatus] = useState<ExecutionStatus>('READY');
  const [failDialogTaskId, setFailDialogTaskId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/assembly-execution', { cache: 'no-store' });
      if (!res.ok) {
        setRows([]);
        setListError(t('load_failed'));
        return;
      }
      const data = (await res.json()) as ExecutionTaskRow[];
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

  const resetCreateForm = () => {
    setSkuItemCode('');
    setBatchNo('');
    setSerialNo('');
    setBluetoothId('');
    setAssignee('');
    setTaskType('DFU');
    setStage('ASSEMBLY_EOL');
    setStatus('READY');
    setDialogError('');
  };

  const statusMeta = (value: ExecutionStatus) => {
    if (value === 'READY') return { label: t('status_ready'), className: 'bg-blue-100 text-blue-700' };
    if (value === 'NEED_DFU') return { label: t('status_need_dfu'), className: 'bg-amber-100 text-amber-700' };
    if (value === 'BLOCKED') return { label: t('status_blocked'), className: 'bg-red-100 text-red-700' };
    if (value === 'IN_PROGRESS') return { label: t('status_in_progress'), className: 'bg-purple-100 text-purple-700' };
    return { label: t('status_done'), className: 'bg-emerald-100 text-emerald-700' };
  };

  const stageLabel = (value: ExecutionStage) => {
    if (value === 'PCBA') return t('stage_pcba');
    if (value === 'ASSEMBLY_EOL') return t('stage_assembly_eol');
    return t('stage_finished_goods');
  };

  const taskTypeLabel = (value: ExecutionTaskType) => {
    if (value === 'DFU') return t('task_type_dfu');
    if (value === 'FLASH_REWORK') return t('task_type_flash_rework');
    return t('task_type_bind_verify');
  };

  const createTask = async () => {
    setDialogError('');
    setListMessage('');
    setListError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assembly-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuItemCode: skuItemCode.trim(),
          batchNo: batchNo.trim(),
          serialNo: serialNo.trim().toUpperCase(),
          bluetoothId: bluetoothId.trim().toUpperCase(),
          assignee: assignee.trim(),
          taskType,
          stage,
          status,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const map: Record<string, string> = {
          SKU_ITEM_CODE_INVALID: 'sku_item_code_invalid',
          BATCH_NO_REQUIRED: 'batch_no_required',
          SERIAL_NO_REQUIRED: 'serial_no_required',
          BLUETOOTH_ID_REQUIRED: 'bluetooth_id_required',
          TASK_TYPE_INVALID: 'task_type_invalid',
          STAGE_INVALID: 'stage_invalid',
          STATUS_INVALID: 'status_invalid',
          SERIAL_NO_DUPLICATE: 'serial_no_duplicate',
          BLUETOOTH_ID_DUPLICATE: 'bluetooth_id_duplicate',
        };
        const code = payload?.error ?? '';
        setDialogError(map[code] ? t(map[code]) : t('save_failed'));
        return;
      }

      setDialogOpen(false);
      resetCreateForm();
      setListMessage(t('create_success'));
      await loadRows();
    } catch {
      setDialogError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (id: string, action: 'START' | 'COMPLETE' | 'FAIL', reason = '') => {
    setListMessage('');
    setListError('');
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/assembly-execution/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          failReason: reason,
          assignee: assignee.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const map: Record<string, string> = {
          FAIL_REASON_REQUIRED: 'fail_reason_required',
          TASK_ALREADY_DONE: 'task_already_done',
          TASK_NOT_IN_PROGRESS: 'task_not_in_progress',
          TASK_NOT_FOUND: 'task_not_found',
        };
        const code = payload?.error ?? '';
        setListError(map[code] ? t(map[code]) : t('action_failed'));
        return;
      }
      if (action === 'START') setListMessage(t('start_success'));
      if (action === 'COMPLETE') setListMessage(t('complete_success'));
      if (action === 'FAIL') setListMessage(t('fail_success'));
      await loadRows();
    } catch {
      setListError(t('action_failed'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const ready = rows.filter((row) => row.status === 'READY').length;
    const needDfu = rows.filter((row) => row.status === 'NEED_DFU').length;
    const blocked = rows.filter((row) => row.status === 'BLOCKED').length;
    return { ready, needDfu, blocked };
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          {t('add')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-800">
          {t('status_ready')}: {summary.ready}
        </div>
        <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-800">
          {t('status_need_dfu')}: {summary.needDfu}
        </div>
        <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-800">
          {t('status_blocked')}: {summary.blocked}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog_create')}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input placeholder={t('sku_item_code')} value={skuItemCode} onChange={(e) => setSkuItemCode(e.target.value)} />
            <Input placeholder={t('batch_no')} value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            <Input placeholder={t('serial_no')} value={serialNo} onChange={(e) => setSerialNo(e.target.value.toUpperCase())} />
            <Input placeholder={t('bluetooth_id')} value={bluetoothId} onChange={(e) => setBluetoothId(e.target.value.toUpperCase())} />
            <Input placeholder={t('assignee')} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            <Select value={taskType} onValueChange={(v) => setTaskType((v ?? 'DFU') as ExecutionTaskType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('task_type')} />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {taskTypeLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={(v) => setStage((v ?? 'ASSEMBLY_EOL') as ExecutionStage)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('stage')} />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {stageLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus((v ?? 'READY') as ExecutionStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                {INITIAL_STATUSES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {statusMeta(entry).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
            <Button type="button" className="w-full" disabled={isSubmitting} onClick={() => void createTask()}>
              {isSubmitting ? t('submitting') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(failDialogTaskId)} onOpenChange={(open) => !open && setFailDialogTaskId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('fail_dialog_title')}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input placeholder={t('fail_reason')} value={failReason} onChange={(e) => setFailReason(e.target.value)} />
            <Button
              type="button"
              className="w-full"
              variant="destructive"
              disabled={isActionSubmitting}
              onClick={() => {
                if (!failDialogTaskId) return;
                void runAction(failDialogTaskId, 'FAIL', failReason.trim());
                setFailReason('');
                setFailDialogTaskId(null);
              }}
            >
              {isActionSubmitting ? t('submitting') : t('mark_failed')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {listMessage ? <p className="text-sm text-green-600">{listMessage}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="rounded-md border">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('serial_no')}</TableHead>
                <TableHead>{t('bluetooth_id')}</TableHead>
                <TableHead>{t('batch_no')}</TableHead>
                <TableHead>{t('task_type')}</TableHead>
                <TableHead>{t('stage')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.serialNo}</TableCell>
                  <TableCell>{row.bluetoothId}</TableCell>
                  <TableCell>{row.batchNo}</TableCell>
                  <TableCell>{taskTypeLabel(row.taskType)}</TableCell>
                  <TableCell>{stageLabel(row.stage)}</TableCell>
                  <TableCell>
                    <span className={['rounded-full px-2 py-1 text-xs font-medium', statusMeta(row.status).className].join(' ')}>
                      {statusMeta(row.status).label}
                    </span>
                    {row.failReason ? (
                      <p className="mt-1 text-xs text-red-600">{row.failReason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isActionSubmitting || row.status === 'IN_PROGRESS' || row.status === 'DONE'}
                        onClick={() => void runAction(row.id, 'START')}
                      >
                        {t('start')}
                      </Button>
                      <Button
                        size="xs"
                        disabled={isActionSubmitting || row.status !== 'IN_PROGRESS'}
                        onClick={() => void runAction(row.id, 'COMPLETE')}
                      >
                        {t('complete')}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={isActionSubmitting}
                        onClick={() => {
                          setFailReason('');
                          setFailDialogTaskId(row.id);
                        }}
                      >
                        {t('mark_failed')}
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

