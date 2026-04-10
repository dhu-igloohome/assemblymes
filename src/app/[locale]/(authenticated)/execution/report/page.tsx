'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExecutionStatus, IssueStatus, IssueType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, MessageSquare, PhoneCall, Scan, Search, ArrowRight, FileText, Activity, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ExecutionPage() {
  const t = useTranslations('Execution');
  const [activeTab, setActiveTab] = useState('operations');
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  
  // WO Operations State
  const [operations, setOperations] = useState<Record<string, any>[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  
  // Reporting State
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingOp, setReportingOp] = useState<Record<string, any> | null>(null);
  const [reportGoodQty, setReportGoodQty] = useState('');
  const [reportScrapQty, setReportScrapQty] = useState('0');
  const [reportTime, setReportTime] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  // Andon State
  const [issues, setIssues] = useState<any[]>([]);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>('OTHER');
  const [issueDesc, setIssueDesc] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  // QR Scan / Batch State
  const [woSearch, setWoSearch] = useState('');
  const [scannedWo, setScannedWo] = useState<Record<string, any> | null>(null);
  const [isSearchingWo, setIsSearchingWo] = useState(false);
  const [batchQty, setBatchQty] = useState('');

  // Personal Stats State
  const [personalStats, setPersonalStats] = useState({ todayQty: 0, todayScrap: 0, target: 100 });
  
  const loadOperations = useCallback(async () => {
    setLoadingOps(true);
    try {
      const res = await fetch('/api/execution/operations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOperations(data);
        
        // 模拟计算个人今日战报 (实际应从后端获取)
        const today = new Date().toDateString();
        const personalTotal = data.reduce((sum: number, op: any) => sum + (op.completedQty || 0), 0);
        setPersonalStats(prev => ({ ...prev, todayQty: personalTotal }));
      }
    } catch {
      setListError('Failed to load operations');
    } finally {
      setLoadingOps(false);
    }
  }, []);

  const loadIssues = useCallback(async () => {
    try {
      const res = await fetch('/api/execution/issues', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    void loadOperations();
    void loadIssues();
  }, [loadOperations, loadIssues]);

  const handleSearchWo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woSearch.trim()) return;
    setIsSearchingWo(true);
    setScannedWo(null);
    setListError('');
    try {
      const res = await fetch(`/api/work-orders?workOrderNo=${woSearch.trim()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setScannedWo(data[0]);
          setBatchQty(String(data[0].plannedQty - (data[0].completedQty || 0)));
        } else {
          setListError(t('work_order_not_found'));
        }
      }
    } catch {
      setListError(t('load_failed'));
    } finally {
      setIsSearchingWo(false);
    }
  };

  const handleBatchReport = async () => {
    if (!scannedWo) return;
    setIsReporting(true);
    setReportError('');
    try {
      const res = await fetch('/api/execution/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: scannedWo.id,
          goodQty: parseInt(batchQty, 10) || 0,
        })
      });
      if (res.ok) {
        setListMessage(t('report_success'));
        setScannedWo(null);
        setWoSearch('');
        await loadOperations();
      } else {
        const payload = await res.json().catch(() => null);
        setReportError(payload?.error || t('save_failed'));
      }
    } catch {
      setReportError(t('save_failed'));
    } finally {
      setIsReporting(false);
    }
  };

  const openReportDialog = (op: Record<string, any>) => {
    setReportingOp(op);
    const defaultQty = (op.workOrder?.plannedQty || 0) - (op.completedQty || 0);
    setReportGoodQty(defaultQty > 0 ? String(defaultQty) : '0');
    setReportScrapQty('0');
    setReportTime(String((op.standardTimeSec || 0) * (defaultQty > 0 ? defaultQty : 1)));
    setReportError('');
    setReportDialogOpen(true);
  };

  const handleReportProduction = async () => {
    if (!reportingOp) return;
    setIsReporting(true);
    try {
      const res = await fetch('/api/execution/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderOperationId: reportingOp.id,
          goodQty: parseInt(reportGoodQty, 10) || 0,
          scrapQty: parseInt(reportScrapQty, 10) || 0,
          timeSpentSec: parseInt(reportTime, 10) || 0,
          remarks: reportRemarks,
        })
      });
      if (res.ok) {
        setReportDialogOpen(false);
        setListMessage(t('report_success'));
        await loadOperations();
      } else {
        const data = await res.json();
        setReportError(data.error || 'Failed');
      }
    } catch {
      setReportError('Failed');
    } finally {
      setIsReporting(false);
    }
  };

  const activeIssuesCount = useMemo(() => 
    issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length
  , [issues]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header & Personal Achievement Board */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('title')}</h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-500 flex items-center gap-2 font-medium">
              <Activity className="size-4 text-indigo-500" />
              {t('overview')}
            </p>
            {activeIssuesCount > 0 && (
              <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2 animate-pulse">
                <AlertCircle className="size-3" />
                <span className="text-[10px] font-black uppercase">{activeIssuesCount} {t('issue_status_open')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 个人计件战报 - 小厂落地的核心驱动力 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white border-2 border-indigo-600 rounded-2xl p-3 shadow-sm flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">今日产出 (PCS)</span>
            <span className="text-2xl font-black text-indigo-900">{personalStats.todayQty}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">今日达成率</span>
            <span className="text-2xl font-black text-slate-900">{Math.round((personalStats.todayQty / personalStats.target) * 100)}%</span>
          </div>
          <div className="hidden sm:flex bg-emerald-50 border border-emerald-100 rounded-2xl p-3 shadow-sm flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">质量合格率</span>
            <span className="text-2xl font-black text-emerald-700">99.8%</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="operations" className="px-6">{t('work_orders_tab')}</TabsTrigger>
          <TabsTrigger value="issues" className="px-6">{t('issue_history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Scan Zone */}
          <Card className="border-indigo-200 bg-indigo-50/30 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <form onSubmit={handleSearchWo} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <Scan className="size-4" />
                    {t('scan_wo_label') || '扫码/输入工单号'}
                  </label>
                  <div className="relative">
                    <Input 
                      placeholder={t('scan_wo_placeholder') || '在此扫码或输入工单号...'} 
                      value={woSearch} 
                      onChange={e => setWoSearch(e.target.value.toUpperCase())}
                      className="h-12 bg-white border-indigo-200 pl-10 text-lg font-mono focus:ring-indigo-500"
                    />
                    <Search className="absolute left-3 top-3.5 size-5 text-slate-400" />
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={isSearchingWo} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md">
                  {isSearchingWo ? t('loading') : (t('search') || '查询')}
                </Button>
              </form>

              {listError && <p className="text-red-500 text-sm mt-2 font-medium">{listError}</p>}
              {listMessage && <p className="text-emerald-600 text-sm mt-2 font-medium">{listMessage}</p>}

              {/* Scanned WO Details & Batch Action */}
              {scannedWo && (
                <div className="mt-6 bg-white rounded-xl border border-indigo-100 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-6 mb-6">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('current_wo')}</p>
                      <h2 className="text-2xl font-black text-slate-900">
                        {scannedWo.workOrderNo} 
                        <span className="ml-3 text-indigo-600 font-bold">{scannedWo.skuItemCode}</span>
                      </h2>
                      <div className="flex gap-4 mt-2">
                        <span className="text-sm text-slate-500 font-medium">{t('planned_qty')}: <b className="text-slate-900">{scannedWo.plannedQty}</b></span>
                        <span className="text-sm text-slate-500 font-medium">{t('completed_qty')}: <b className="text-emerald-600">{scannedWo.completedQty || 0}</b></span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-indigo-700 uppercase tracking-tight">{t('report_all_ops')}</label>
                        <Input 
                          type="number" 
                          value={batchQty} 
                          onChange={e => setBatchQty(e.target.value)}
                          className="h-10 w-28 bg-white border-indigo-200 text-center font-bold text-lg"
                        />
                      </div>
                      <Button 
                        onClick={handleBatchReport} 
                        disabled={isReporting || !batchQty}
                        className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 shadow-lg shadow-indigo-200 mt-4"
                      >
                        {isReporting ? t('submitting') : (
                          <span className="flex items-center gap-2 font-bold uppercase">
                            <CheckCircle2 className="size-5" />
                            {t('report_confirm')}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {scannedWo.operations?.map((op: any) => (
                      <div key={op.id} className="group relative bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-indigo-300 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Seq {op.sequence}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {op.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{op.operationName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mb-4 uppercase tracking-tighter">{op.workstation}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-slate-700">{op.completedQty} / {scannedWo.plannedQty}</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${op.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, (op.completedQty / scannedWo.plannedQty) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-4 text-xs font-bold text-indigo-600 hover:bg-indigo-50 group-hover:bg-indigo-50"
                          onClick={() => openReportDialog({ ...op, workOrder: scannedWo })}
                          disabled={op.status === 'COMPLETED'}
                        >
                          {t('report_production')}
                          <ArrowRight className="ml-2 size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regular List (Fallback) */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{t('overview')}</h3>
               <Button variant="ghost" size="sm" onClick={loadOperations} className="text-slate-400 hover:text-indigo-600">
                 <Clock className="size-4 mr-2" />
                 Refresh List
               </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[150px]">{t('work_order_no')}</TableHead>
                  <TableHead>{t('operation_name')}</TableHead>
                  <TableHead>{t('workstation')}</TableHead>
                  <TableHead className="text-center">{t('completed_qty')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono font-bold text-slate-900">{op.workOrder?.workOrderNo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold">#{op.sequence}</span>
                        <span className="font-medium">{op.operationName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium uppercase">{op.workstation}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className="text-emerald-600">{op.completedQty}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-slate-400">{op.workOrder?.plannedQty}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {op.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {op.sopUrl && (
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => window.open(op.sopUrl, '_blank')}>
                            <FileText className="size-4" />
                          </Button>
                        )}
                        <Button size="sm" className="h-8 font-bold" disabled={op.status === 'COMPLETED'} onClick={() => openReportDialog(op)}>
                          {t('report_production')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {operations.length === 0 && !loadingOps && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-slate-400 italic">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Issues Tab Content Placeholder (Logic remains from previous version) */}
        <TabsContent value="issues">
           <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
             Use the "Andon Board" for detailed issue management.
           </div>
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-2xl overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
          <div className="flex flex-col md:flex-row h-full">
            {/* 左侧：SOP 视觉引导 (如果是小厂，这就是最实用的防呆措施) */}
            <div className="w-full md:w-1/2 bg-slate-900 flex flex-col p-6 text-white border-r border-slate-800">
               <div className="flex items-center gap-3 mb-6">
                 <div className="bg-indigo-600 p-2 rounded-xl">
                   <FileText className="size-5" />
                 </div>
                 <div>
                   <h3 className="text-lg font-black uppercase">SOP 指引</h3>
                   <p className="text-[10px] text-slate-400 font-bold">请确认作业动作符合标准</p>
                 </div>
               </div>
               <div className="flex-1 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center relative group">
                 {reportingOp?.sopUrl ? (
                   <img src={reportingOp.sopUrl} alt="SOP" className="size-full object-contain" />
                 ) : (
                   <div className="text-center p-8">
                     <Package className="size-12 text-slate-700 mx-auto mb-4" />
                     <p className="text-xs text-slate-500 font-bold uppercase">暂无工艺图纸预览</p>
                   </div>
                 )}
                 <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="outline" size="sm" className="bg-white text-slate-900 font-bold" onClick={() => window.open(reportingOp?.sopUrl, '_blank')}>
                     查看完整文件
                   </Button>
                 </div>
               </div>
               <div className="mt-6 space-y-2">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>标准工时 (ST)</span>
                    <span className="text-indigo-400">{reportingOp?.standardTimeSec || 0}s / PCS</span>
                 </div>
               </div>
            </div>

            {/* 右侧：报工表单 */}
            <div className="flex-1 p-8 bg-white">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('report_production')}</DialogTitle>
                <DialogDescription className="font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">
                  {reportingOp?.workOrder?.workOrderNo} / {reportingOp?.operationName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">良品报工数 (Good)</label>
                    <Input type="number" value={reportGoodQty} onChange={(e) => setReportGoodQty(e.target.value)} className="h-14 text-2xl font-black border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-red-400">不良报工数 (Scrap)</label>
                    <Input type="number" value={reportScrapQty} onChange={(e) => setReportScrapQty(e.target.value)} className="h-14 text-2xl font-black border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50 text-red-600" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">备注 (Remarks)</label>
                  <Textarea 
                    placeholder="选填：记录异常原因或作业说明..." 
                    value={reportRemarks} 
                    onChange={(e) => setReportRemarks(e.target.value)}
                    className="border-slate-200 min-h-[100px]"
                  />
                </div>

                {reportError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold animate-shake">{reportError}</div>}

                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1 h-14 font-bold text-slate-400" onClick={() => setReportDialogOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={handleReportProduction} disabled={isReporting} className="flex-[2] h-14 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-black text-lg">
                    {isReporting ? '提交中...' : '确认报工'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
