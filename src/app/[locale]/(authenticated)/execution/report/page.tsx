'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExecutionStage, ExecutionStatus, ExecutionTaskType, IssueStatus, IssueType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, MessageSquare, PhoneCall, Upload, FileText } from 'lucide-react';
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

interface IssueRecordRow {
  id: string;
  issueType: IssueType;
  status: IssueStatus;
  description: string;
  workOrderId: string | null;
  operationId: string | null;
  workCenterCode: string | null;
  reporter: string;
  responder: string | null;
  reportedAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  workOrder?: { workOrderNo: string };
  operation?: { operationName: string; sequence: number };
}

export default function ExecutionPage() {
  const t = useTranslations('Execution');
  const [rows, setRows] = useState<ExecutionTaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  
  // Task Create State
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
  const [taskStatus, setTaskStatus] = useState<ExecutionStatus>('READY');

  // Trace Upload State
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadDriveUrl, setUploadDriveUrl] = useState('');
  const [uploadBatchNo, setUploadBatchNo] = useState('');
  const [uploadSkuItemCode, setUploadSkuItemCode] = useState('');
  const [uploads, setUploads] = useState<TraceUploadRow[]>([]);
  
  // WO Operations State
  const [operations, setOperations] = useState<Record<string, any>[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingOp, setReportingOp] = useState<Record<string, any> | null>(null);
  
  const [reportGoodQty, setReportGoodQty] = useState('');
  const [reportScrapQty, setReportScrapQty] = useState('0');
  const [reportReworkQty, setReportReworkQty] = useState('0');
  const [reportTime, setReportTime] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  // Issue Management State
  const [issues, setIssues] = useState<IssueRecordRow[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [reportingIssueOp, setReportingIssueOp] = useState<Record<string, any> | null>(null);
  const [issueType, setIssueType] = useState<IssueType>('OTHER');
  const [issueDesc, setIssueDesc] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [activeTab, setActiveTab] = useState('operations');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

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

  const loadIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const res = await fetch('/api/execution/issues', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch {
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assembly-execution', { cache: 'no-store' });
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

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/traceability/batch-upload', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUploads(data);
      }
    } catch {
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
    void loadIssues();
    void loadRows();
    void loadUploads();
  }, [loadOperations, loadIssues, loadRows, loadUploads]);

  const handleReportProduction = async () => {
    if (!reportingOp) return;
    setReportError('');
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
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setReportError(payload?.error || t('save_failed'));
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

  const handleReportIssue = async () => {
    setIsReportingIssue(true);
    try {
      const res = await fetch('/api/execution/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType,
          description: issueDesc,
          workOrderId: reportingIssueOp?.workOrderId,
          operationId: reportingIssueOp?.id,
          workCenterCode: reportingIssueOp?.workstation,
        })
      });
      if (res.ok) {
        setIssueDialogOpen(false);
        setIssueDesc('');
        setListMessage(t('issue_report_success'));
        await loadIssues();
      }
    } catch {
    } finally {
      setIsReportingIssue(false);
    }
  };

  const updateIssueStatus = async (id: string, nextStatus: IssueStatus, resolution = '') => {
    try {
      const res = await fetch(`/api/execution/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, resolution })
      });
      if (res.ok) {
        await loadIssues();
      }
    } catch {
    }
  };

  const createTask = async () => {
    setDialogError('');
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
          status: taskStatus,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setDialogError(payload?.error || t('save_failed'));
        return;
      }
      setDialogOpen(false);
      setListMessage(t('create_success'));
      await loadRows();
    } catch {
      setDialogError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadTraceFile = async () => {
    setUploadError('');
    setIsUploading(true);
    try {
      const res = await fetch('/api/traceability/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchNo: uploadBatchNo.trim(),
          skuItemCode: uploadSkuItemCode.trim(),
          driveFileUrl: uploadDriveUrl.trim(),
          recordsText: '', // Simplified
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setUploadError(payload?.error || t('trace_upload_failed'));
        return;
      }
      setUploadDialogOpen(false);
      setListMessage(t('trace_upload_success'));
      await loadUploads();
    } catch {
      setUploadError(t('trace_upload_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const runAction = async (id: string, action: 'START' | 'COMPLETE' | 'FAIL', reason = '') => {
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/assembly-execution/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, failReason: reason }),
      });
      if (res.ok) {
        await loadRows();
      }
    } catch {
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const openReportDialog = (op: Record<string, any>) => {
    setReportingOp(op);
    const wo = op.workOrder;
    const defaultQty = (wo?.plannedQty || 0) - (op.completedQty || 0);
    setReportGoodQty(defaultQty > 0 ? String(defaultQty) : '0');
    setReportScrapQty('0');
    setReportReworkQty('0');
    setReportTime(String((op.standardTimeSec || 0) * (defaultQty > 0 ? defaultQty : 0)));
    setReportRemarks('');
    setReportError('');
    setReportDialogOpen(true);
  };

  const openIssueDialog = (op: Record<string, any>) => {
    setReportingIssueOp(op);
    setIssueType('OTHER');
    setIssueDesc('');
    setIssueDialogOpen(true);
  };

  const statusMeta = (value: ExecutionStatus) => {
    if (value === 'READY') return { label: t('status_ready'), className: 'bg-blue-100 text-blue-700' };
    if (value === 'NEED_DFU') return { label: t('status_need_dfu'), className: 'bg-amber-100 text-amber-700' };
    if (value === 'BLOCKED') return { label: t('status_blocked'), className: 'bg-red-100 text-red-700' };
    if (value === 'IN_PROGRESS') return { label: t('status_in_progress'), className: 'bg-purple-100 text-purple-700' };
    return { label: t('status_done'), className: 'bg-emerald-100 text-emerald-700' };
  };

  const activeIssuesCount = useMemo(() => 
    issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length
  , [issues]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeIssuesCount > 0 ? (
              <span className="flex items-center gap-1.5 text-red-600 font-medium animate-pulse">
                <AlertCircle className="size-4" />
                {activeIssuesCount} {t('issue_status_open')}
              </span>
            ) : (
              <span className="text-slate-500">{t('overview')}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="size-4 mr-2" />
            {t('upload_trace')}
          </Button>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            {t('add')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="operations">{t('work_orders_tab')}</TabsTrigger>
          <TabsTrigger value="issues" className="relative">
            {t('issue_history')}
            {activeIssuesCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {activeIssuesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="traceability">{t('traceability_tab')}</TabsTrigger>
        </TabsList>

        {listMessage && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
            {listMessage}
          </div>
        )}

        <TabsContent value="operations">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loadingOps ? (
              <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>{t('work_order_no')}</TableHead>
                    <TableHead>{t('sequence')}</TableHead>
                    <TableHead>{t('operation_name')}</TableHead>
                    <TableHead>{t('workstation')}</TableHead>
                    <TableHead>{t('planned_qty')}</TableHead>
                    <TableHead>{t('completed_qty')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">{op.workOrder?.workOrderNo}</TableCell>
                      <TableCell className="text-slate-500">#{op.sequence}</TableCell>
                      <TableCell className="font-medium">{op.operationName}</TableCell>
                      <TableCell>{op.workstation}</TableCell>
                      <TableCell>{op.workOrder?.plannedQty}</TableCell>
                      <TableCell>{op.completedQty}</TableCell>
                      <TableCell>
                        <span className={[
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          op.status === 'PENDING' ? 'bg-slate-100 text-slate-700' :
                          op.status === 'STARTED' ? 'bg-indigo-100 text-indigo-700' :
                          op.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        ].join(' ')}>
                          {op.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {op.sopUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              onClick={() => window.open(op.sopUrl, '_blank')}
                              title={t('view_sop')}
                            >
                              <FileText className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openIssueDialog(op)}
                            title={t('issue_andon')}
                          >
                            <PhoneCall className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={op.status === 'COMPLETED'}
                            onClick={() => openReportDialog(op)}
                          >
                            {t('report_production')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {operations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                        {t('empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4">
            {issues.map((issue) => (
              <div key={issue.id} className={[
                'rounded-xl border p-4 shadow-sm transition-all',
                issue.status === 'OPEN' ? 'border-red-200 bg-red-50/30' :
                issue.status === 'IN_PROGRESS' ? 'border-amber-200 bg-amber-50/30' :
                'border-slate-200 bg-white'
              ].join(' ')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        issue.issueType === 'QUALITY' ? 'bg-red-100 text-red-700' :
                        issue.issueType === 'MATERIAL' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      ].join(' ')}>
                        {t(`issue_type_${issue.issueType.toLowerCase()}` as any)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(issue.reportedAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {issue.workOrder?.workOrderNo} - {issue.operation?.operationName}
                    </h3>
                    <p className="text-sm text-slate-700 bg-white/50 p-2 rounded border border-slate-100 mt-2">
                      {issue.description}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {t('issue_reporter')}: {issue.reporter}</span>
                      {issue.responder && <span className="flex items-center gap-1"><MessageSquare className="size-3" /> {t('issue_status_in_progress')}: {issue.responder}</span>}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    {issue.status === 'OPEN' && (
                      <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => updateIssueStatus(issue.id, 'IN_PROGRESS')}>
                        {t('issue_respond')}
                      </Button>
                    )}
                    {issue.status === 'IN_PROGRESS' && (
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t('issue_resolution')} 
                          className="h-8 text-xs w-32" 
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                        />
                        <Button size="sm" onClick={() => {
                          updateIssueStatus(issue.id, 'RESOLVED', resolutionText);
                          setResolutionText('');
                        }}>
                          {t('issue_resolve')}
                        </Button>
                      </div>
                    )}
                    {issue.status === 'RESOLVED' && (
                      <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => updateIssueStatus(issue.id, 'CLOSED')}>
                        <CheckCircle2 className="size-4 mr-1" /> {t('issue_close')}
                      </Button>
                    )}
                    {issue.status === 'CLOSED' && (
                      <span className="text-xs text-slate-400 font-medium py-1 px-2 bg-slate-100 rounded text-center">
                        {t('issue_status_closed')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="traceability">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             {isLoading ? (
               <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
             ) : (
               <Table>
                 <TableHeader className="bg-slate-50">
                   <TableRow>
                     <TableHead>{t('serial_no')}</TableHead>
                     <TableHead>{t('bluetooth_id')}</TableHead>
                     <TableHead>{t('batch_no')}</TableHead>
                     <TableHead>{t('status')}</TableHead>
                     <TableHead className="text-right">{t('actions')}</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {rows.map((row) => (
                     <TableRow key={row.id}>
                       <TableCell className="font-medium">{row.serialNo}</TableCell>
                       <TableCell>{row.bluetoothId}</TableCell>
                       <TableCell>{row.batchNo}</TableCell>
                       <TableCell>
                         <span className={['rounded-full px-2 py-0.5 text-xs font-medium', statusMeta(row.status).className].join(' ')}>
                           {statusMeta(row.status).label}
                         </span>
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
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
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </div>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-md border-red-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <PhoneCall className="size-5" />
              {t('issue_andon')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>{t('work_order_no')}:</strong> {reportingIssueOp?.workOrder?.workOrderNo}</p>
              <p><strong>{t('operation_name')}:</strong> {reportingIssueOp?.operationName}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('issue_type')}</label>
              <Select value={issueType} onValueChange={(v: any) => setIssueType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATERIAL">{t('issue_type_material')}</SelectItem>
                  <SelectItem value="QUALITY">{t('issue_type_quality')}</SelectItem>
                  <SelectItem value="EQUIPMENT">{t('issue_type_equipment')}</SelectItem>
                  <SelectItem value="PROCESS">{t('issue_type_process')}</SelectItem>
                  <SelectItem value="OTHER">{t('issue_type_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('issue_desc')}</label>
              <Textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>{t('cancel' as any)}</Button>
            <Button variant="destructive" onClick={handleReportIssue} disabled={isReportingIssue || !issueDesc}>
              {isReportingIssue ? t('submitting') : t('issue_andon')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('report_production')} - {reportingOp?.operationName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">{t('good_qty')}</label>
                <Input type="number" value={reportGoodQty} onChange={(e) => setReportGoodQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">{t('scrap_qty')}</label>
                <Input type="number" value={reportScrapQty} onChange={(e) => setReportScrapQty(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">{t('time_spent_sec')}</label>
              <Input type="number" value={reportTime} onChange={(e) => setReportTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">{t('remarks')}</label>
              <Input value={reportRemarks} onChange={(e) => setReportRemarks(e.target.value)} />
            </div>
            {reportError && <p className="text-xs text-red-600 font-medium">{reportError}</p>}
            <Button className="w-full mt-2" disabled={isReporting} onClick={handleReportProduction}>
              {isReporting ? t('submitting') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('dialog_create')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <Input placeholder={t('sku_item_code')} value={skuItemCode} onChange={e => setSkuItemCode(e.target.value)} />
             <Input placeholder={t('batch_no')} value={batchNo} onChange={e => setBatchNo(e.target.value)} />
             <div className="grid grid-cols-2 gap-2">
               <Input placeholder={t('serial_range_start')} value={serialStart} onChange={e => setSerialStart(e.target.value)} />
               <Input placeholder={t('serial_range_end')} value={serialEnd} onChange={e => setSerialEnd(e.target.value)} />
             </div>
             {dialogError && <p className="text-xs text-red-600">{dialogError}</p>}
             <Button className="w-full" onClick={createTask} disabled={isSubmitting}>
               {isSubmitting ? t('submitting') : t('save')}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{t('trace_upload_dialog_title')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <Input placeholder={t('batch_no')} value={uploadBatchNo} onChange={e => setUploadBatchNo(e.target.value)} />
             <Input placeholder={t('sku_item_code')} value={uploadSkuItemCode} onChange={e => setUploadSkuItemCode(e.target.value)} />
             <Input placeholder={t('drive_file_url')} value={uploadDriveUrl} onChange={e => setUploadDriveUrl(e.target.value)} />
             {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
             <Button className="w-full" onClick={uploadTraceFile} disabled={isUploading}>
               {isUploading ? t('submitting') : t('save')}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
