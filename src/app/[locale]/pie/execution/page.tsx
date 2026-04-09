'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExecutionStage, ExecutionStatus, ExecutionTaskType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  // -------------------------
  // WO Operations State
  // -------------------------
  const [operations, setOperations] = useState<Record<string, unknown>[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingOp, setReportingOp] = useState<Record<string, unknown> | null>(null);
  
  const [reportGoodQty, setReportGoodQty] = useState('');
  const [reportScrapQty, setReportScrapQty] = useState('0');
  const [reportReworkQty, setReportReworkQty] = useState('0');
  const [reportTime, setReportTime] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  const loadOperations = useCallback(async () => {
    setLoadingOps(true);
    try {
      const res = await fetch('/api/execution/operations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOperations(data);
      }
    } catch {
      setOperations([]);
    } finally {
      setLoadingOps(false);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const handleReportProduction = async () => {
    if (!reportingOp) return;
    setReportError('');
    setListMessage('');
    setIsReporting(true);
    
    try {
      const res = await fetch('/api/execution/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderOperationId: reportingOp.id,
          goodQty: parseInt(reportGoodQty, 10) || 0,
          scrapQty: parseInt(reportScrapQty, 10) || 0,
          reworkQty: parseInt(reportReworkQty, 10) || 0,
          timeSpentSec: parseInt(reportTime, 10) || 0,
          remarks: reportRemarks.trim()
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const map: Record<string, string> = {
          INVALID_NUMERIC_VALUES: 'invalid_numeric_values',
          OPERATION_ID_REQUIRED: 'operation_id_required',
        };
        const code = payload?.error ?? '';
        setReportError(map[code] ? t(map[code]) : t('save_failed'));
        return;
      }

      setReportDialogOpen(false);
      setListMessage(t('report_success'));
      await loadOperations();
    } catch {
      setReportError(t('save_failed'));
    } finally {
      setIsReporting(false);
    }
  };

  const openReportDialog = (op: Record<string, unknown>) => {
    setReportingOp(op);
    const wo = op.workOrder as Record<string, unknown> | undefined;
    const defaultQty = (wo?.plannedQty as number || 0) - ((op.completedQty as number) || 0);
    setReportGoodQty(defaultQty > 0 ? String(defaultQty) : '0');
    setReportScrapQty('0');
    setReportReworkQty('0');
    setReportTime(String(((op.standardTimeSec as number) || 0) * (defaultQty > 0 ? defaultQty : 0)));
    setReportRemarks('');
    setReportError('');
    setReportDialogOpen(true);
  };

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

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">{t('work_orders_tab')}</TabsTrigger>
          <TabsTrigger value="traceability">{t('traceability_tab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {loadingOps ? (
              <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('work_order_no')}</TableHead>
                    <TableHead>{t('sequence')}</TableHead>
                    <TableHead>{t('operation_name')}</TableHead>
                    <TableHead>{t('workstation')}</TableHead>
                    <TableHead>{t('planned_qty')}</TableHead>
                    <TableHead>{t('completed_qty')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => {
                    const wo = op.workOrder as Record<string, unknown> | undefined;
                    return (
                    <TableRow key={String(op.id)}>
                      <TableCell className="font-medium">{String(wo?.workOrderNo || '')}</TableCell>
                      <TableCell>{String(op.sequence || '')}</TableCell>
                      <TableCell>{String(op.operationName || '')}</TableCell>
                      <TableCell>{String(op.workstation || '')}</TableCell>
                      <TableCell>{String(wo?.plannedQty || '')}</TableCell>
                      <TableCell>{String(op.completedQty || '')}</TableCell>
                      <TableCell>
                        <span className={['rounded-full px-2 py-1 text-xs font-medium', 
                          op.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
                          op.status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
                          op.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        ].join(' ')}>
                          {String(op.status || '')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="xs"
                          disabled={op.status === 'COMPLETED'}
                          onClick={() => openReportDialog(op)}
                        >
                          {t('report_production')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                  {operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                        {t('empty')}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="traceability" className="space-y-4">
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

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-6">
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
        </TabsContent>
      </Tabs>

      {/* Report Production Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('report_production')} - {String(reportingOp?.operationName || '')}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="text-sm text-gray-600">
              {t('work_order_no')}: {String((reportingOp?.workOrder as Record<string, unknown> | undefined)?.workOrderNo || '')} <br/>
              {t('planned_qty')}: {String((reportingOp?.workOrder as Record<string, unknown> | undefined)?.plannedQty || '')} <br/>
              {t('completed_qty')}: {String(reportingOp?.completedQty || '0')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('good_qty')}</label>
              <Input
                type="number"
                min="0"
                value={reportGoodQty}
                onChange={(e) => setReportGoodQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrap_qty')}</label>
              <Input
                type="number"
                min="0"
                value={reportScrapQty}
                onChange={(e) => setReportScrapQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('rework_qty')}</label>
              <Input
                type="number"
                min="0"
                value={reportReworkQty}
                onChange={(e) => setReportReworkQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('time_spent_sec')}</label>
              <Input
                type="number"
                min="0"
                value={reportTime}
                onChange={(e) => setReportTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('remarks')}</label>
              <Input
                value={reportRemarks}
                onChange={(e) => setReportRemarks(e.target.value)}
              />
            </div>

            {reportError ? <p className="text-sm text-red-600">{reportError}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={isReporting}
              onClick={() => void handleReportProduction()}
            >
              {isReporting ? t('submitting') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


