'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExecutionStage, ExecutionStatus, ExecutionTaskType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  parseRecordsFromCsvText,
  validateUniqueRecords,
  type TraceRecordInput,
} from '@/lib/batch-trace-records';

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

interface TraceUploadRow {
  id: string;
  batchNo: string;
  skuItemCode: string;
  driveFileUrl: string;
  uploadedBy: string | null;
  recordCount: number;
  uploadedAt: string;
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
  const [serialStart, setSerialStart] = useState('');
  const [serialEnd, setSerialEnd] = useState('');
  const [bluetoothStart, setBluetoothStart] = useState('');
  const [bluetoothEnd, setBluetoothEnd] = useState('');
  const [assignee, setAssignee] = useState('');
  const [taskType, setTaskType] = useState<ExecutionTaskType>('DFU');
  const [stage, setStage] = useState<ExecutionStage>('ASSEMBLY_EOL');
  const [status, setStatus] = useState<ExecutionStatus>('READY');
  const [failDialogTaskId, setFailDialogTaskId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [uploads, setUploads] = useState<TraceUploadRow[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadDriveUrl, setUploadDriveUrl] = useState('');
  const [uploadRecordsText, setUploadRecordsText] = useState('');
  const [uploadBatchNo, setUploadBatchNo] = useState('');
  const [uploadSkuItemCode, setUploadSkuItemCode] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFileRecords, setUploadFileRecords] = useState<TraceRecordInput[] | null>(null);
  const [csvParsedCount, setCsvParsedCount] = useState<number | null>(null);
  const [csvFileName, setCsvFileName] = useState('');

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

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/traceability/batch-upload', { cache: 'no-store' });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as TraceUploadRow[];
      setUploads(data);
    } catch {
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  const resetCreateForm = () => {
    setSkuItemCode('');
    setBatchNo('');
    setSerialStart('');
    setSerialEnd('');
    setBluetoothStart('');
    setBluetoothEnd('');
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
          serialStart: serialStart.trim(),
          serialEnd: serialEnd.trim(),
          bluetoothStart: bluetoothStart.trim(),
          bluetoothEnd: bluetoothEnd.trim(),
          assignee: assignee.trim(),
          taskType,
          stage,
          status,
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        created?: number;
        batch?: boolean;
      } | null;
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
          RANGE_INCOMPLETE: 'range_incomplete',
          RANGE_REQUIRED: 'range_required',
          RANGE_PARSE_FAILED: 'range_parse_failed',
          RANGE_PREFIX_MISMATCH: 'range_prefix_mismatch',
          RANGE_ORDER_INVALID: 'range_order_invalid',
          RANGE_LENGTH_MISMATCH: 'range_length_mismatch',
          RANGE_TOO_LARGE: 'range_too_large',
          SKU_NOT_FOUND: 'sku_not_found',
          SKU_TRACEABILITY_DISABLED: 'sku_traceability_disabled',
          SKU_DFU_DISABLED: 'sku_dfu_disabled',
          SKU_FLASHING_DISABLED: 'sku_flashing_disabled',
        };
        const code = payload?.error ?? '';
        setDialogError(map[code] ? t(map[code]) : t('save_failed'));
        return;
      }

      setDialogOpen(false);
      resetCreateForm();
      if (payload?.batch && typeof payload.created === 'number') {
        setListMessage(t('create_success_batch', { count: payload.created }));
      } else {
        setListMessage(t('create_success'));
      }
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

  const handleCsvFileSelected = (fileList: FileList | null) => {
    setUploadError('');
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseRecordsFromCsvText(text);
      if (!parsed.ok) {
        const errMap: Record<string, string> = {
          TRACE_CSV_EMPTY: 'trace_csv_empty',
          TRACE_CSV_HEADER_INVALID: 'trace_csv_header_invalid',
          TRACE_LINE_INVALID: 'trace_line_invalid',
        };
        setUploadFileRecords(null);
        setCsvParsedCount(null);
        setCsvFileName('');
        setUploadError(errMap[parsed.error] ? t(errMap[parsed.error]) : t('csv_parse_failed'));
        return;
      }
      const unique = validateUniqueRecords(parsed.records);
      if (!unique.ok) {
        const uMap: Record<string, string> = {
          SERIAL_NO_DUPLICATE_IN_FILE: 'serial_no_duplicate_in_file',
          BLUETOOTH_ID_DUPLICATE_IN_FILE: 'bluetooth_id_duplicate_in_file',
          SERIAL_NO_REQUIRED: 'serial_no_required',
          BLUETOOTH_ID_REQUIRED: 'bluetooth_id_required',
        };
        setUploadFileRecords(null);
        setCsvParsedCount(null);
        setCsvFileName('');
        setUploadError(uMap[unique.error] ? t(uMap[unique.error]) : t('csv_parse_failed'));
        return;
      }
      setUploadFileRecords(parsed.records);
      setCsvParsedCount(parsed.records.length);
      setCsvFileName(file.name);
      setUploadRecordsText('');
    };
    reader.onerror = () => {
      setUploadError(t('csv_parse_failed'));
      setUploadFileRecords(null);
      setCsvParsedCount(null);
      setCsvFileName('');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const clearCsvSelection = () => {
    setUploadFileRecords(null);
    setCsvParsedCount(null);
    setCsvFileName('');
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const uploadTraceFile = async () => {
    setUploadError('');
    setListMessage('');
    setListError('');
    setIsUploading(true);
    try {
      const payloadBody: Record<string, unknown> = {
        batchNo: uploadBatchNo.trim(),
        skuItemCode: uploadSkuItemCode.trim(),
        driveFileUrl: uploadDriveUrl.trim(),
        uploadedBy: assignee.trim(),
      };
      if (uploadFileRecords && uploadFileRecords.length > 0) {
        payloadBody.records = uploadFileRecords;
      } else {
        payloadBody.recordsText = uploadRecordsText;
      }

      const res = await fetch('/api/traceability/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const map: Record<string, string> = {
          BATCH_NO_REQUIRED: 'batch_no_required',
          SKU_ITEM_CODE_INVALID: 'sku_item_code_invalid',
          DRIVE_URL_INVALID: 'drive_url_invalid',
          TRACE_RECORDS_REQUIRED: 'trace_records_required',
          TRACE_LINE_INVALID: 'trace_line_invalid',
          TRACE_CSV_EMPTY: 'trace_csv_empty',
          TRACE_CSV_HEADER_INVALID: 'trace_csv_header_invalid',
          SERIAL_NO_DUPLICATE_IN_FILE: 'serial_no_duplicate_in_file',
          BLUETOOTH_ID_DUPLICATE_IN_FILE: 'bluetooth_id_duplicate_in_file',
          SERIAL_NO_DUPLICATE: 'serial_no_duplicate',
          BLUETOOTH_ID_DUPLICATE: 'bluetooth_id_duplicate',
          RECORDS_INVALID: 'records_invalid',
          SKU_NOT_FOUND: 'sku_not_found',
          SKU_TRACEABILITY_DISABLED: 'sku_traceability_disabled',
        };
        const code = payload?.error ?? '';
        setUploadError(map[code] ? t(map[code]) : t('trace_upload_failed'));
        return;
      }
      setUploadDialogOpen(false);
      setUploadBatchNo('');
      setUploadSkuItemCode('');
      setUploadDriveUrl('');
      setUploadRecordsText('');
      clearCsvSelection();
      setListMessage(t('trace_upload_success'));
      await Promise.all([loadRows(), loadUploads()]);
    } catch {
      setUploadError(t('trace_upload_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(true)}>
            {t('upload_trace')}
          </Button>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            {t('add')}
          </Button>
        </div>
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
            <p className="text-xs text-gray-500">{t('serial_range_hint')}</p>
            <Input
              placeholder={t('serial_range_start')}
              value={serialStart}
              onChange={(e) => setSerialStart(e.target.value)}
            />
            <Input
              placeholder={t('serial_range_end')}
              value={serialEnd}
              onChange={(e) => setSerialEnd(e.target.value)}
            />
            <p className="text-xs text-gray-500">{t('bluetooth_range_hint')}</p>
            <Input
              placeholder={t('bluetooth_range_start')}
              value={bluetoothStart}
              onChange={(e) => setBluetoothStart(e.target.value)}
            />
            <Input
              placeholder={t('bluetooth_range_end')}
              value={bluetoothEnd}
              onChange={(e) => setBluetoothEnd(e.target.value)}
            />
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

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (open) {
            setUploadError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('trace_upload_dialog_title')}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              placeholder={t('sku_item_code')}
              value={uploadSkuItemCode}
              onChange={(e) => setUploadSkuItemCode(e.target.value)}
            />
            <Input
              placeholder={t('batch_no')}
              value={uploadBatchNo}
              onChange={(e) => setUploadBatchNo(e.target.value)}
            />
            <Input
              placeholder={t('drive_file_url')}
              value={uploadDriveUrl}
              onChange={(e) => setUploadDriveUrl(e.target.value)}
            />
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => handleCsvFileSelected(e.target.files)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => csvFileInputRef.current?.click()}>
                {t('choose_csv_file')}
              </Button>
              {csvFileName ? (
                <span className="text-sm text-gray-600">
                  {csvFileName}
                  {csvParsedCount !== null ? ` · ${t('csv_rows_parsed', { count: csvParsedCount })}` : null}
                </span>
              ) : null}
              {uploadFileRecords && uploadFileRecords.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearCsvSelection}>
                  {t('clear_csv_file')}
                </Button>
              ) : null}
            </div>
            <textarea
              className="min-h-36 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
              placeholder={t('trace_records_text')}
              value={uploadRecordsText}
              disabled={Boolean(uploadFileRecords && uploadFileRecords.length > 0)}
              onChange={(e) => {
                setUploadRecordsText(e.target.value);
                clearCsvSelection();
              }}
            />
            {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={isUploading}
              onClick={() => void uploadTraceFile()}
            >
              {isUploading ? t('submitting') : t('upload_trace')}
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
          {t('trace_upload_list')}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('batch_no')}</TableHead>
              <TableHead>{t('sku_item_code')}</TableHead>
              <TableHead>{t('trace_record_count')}</TableHead>
              <TableHead>{t('drive_file_url')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.batchNo}</TableCell>
                <TableCell>{row.skuItemCode}</TableCell>
                <TableCell>{row.recordCount}</TableCell>
                <TableCell>
                  <a
                    href={row.driveFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {t('open_drive_file')}
                  </a>
                </TableCell>
              </TableRow>
            ))}
            {uploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


