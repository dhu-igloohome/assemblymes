'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ShieldAlert, 
  User, 
  Activity, 
  Clock, 
  FileJson,
  Search,
  ArrowRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  operator: string;
  details: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/audit-logs?limit=50', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="size-8 text-red-600" />
            {t('audit_logs')}
          </h1>
          <p className="text-slate-500 font-medium">{t('audit_desc')}</p>
        </div>
        <Button variant="outline" className="font-bold border-slate-200" onClick={() => void fetchLogs()}>
          <Activity className="size-4 mr-2" />
          {tc('refresh')}
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white pb-8">
           <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Clock className="size-4 text-indigo-400" />
                    Timeline History
                 </CardTitle>
                 <CardDescription className="text-slate-400">Total {total} system events recorded.</CardDescription>
              </div>
              <div className="relative w-64">
                 <Input className="bg-white/10 border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10" placeholder="Search operator..." />
                 <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('audit_time')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('audit_operator')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('audit_action')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('audit_entity')}</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('audit_details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                  <TableCell className="pl-8 py-4 text-xs font-mono text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className="size-6 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="size-3 text-slate-600" />
                       </div>
                       <span className="text-xs font-black text-slate-900">{log.operator}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-slate-600">
                       {log.entity} <span className="text-slate-300 mx-1">/</span> <span className="text-[10px] text-slate-400 font-mono">{log.entityId.slice(-8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-black text-slate-400 group-hover:text-indigo-600"
                      onClick={() => setSelectedLog(log)}
                    >
                       <FileJson className="size-4 mr-2" />
                       View JSON
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                   <TableCell colSpan={5} className="py-20 text-center">
                      <p className="text-xs text-slate-400 font-black uppercase italic">No audit records found yet.</p>
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-8 bg-white">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Audit Transaction Detail
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  Complete technical trace for {selectedLog?.action} on {selectedLog?.entity}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator</p>
                  <p className="text-sm font-bold text-slate-900">{selectedLog?.operator}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                  <p className="text-sm font-bold text-slate-900">{selectedLog ? new Date(selectedLog.createdAt).toLocaleString() : ''}</p>
               </div>
            </div>

            <div className="space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Data Payload</p>
               <pre className="p-6 bg-slate-900 text-indigo-300 rounded-[24px] text-xs font-mono overflow-auto max-h-64 scrollbar-hide border border-indigo-500/20">
                  {selectedLog?.details 
                    ? JSON.stringify(JSON.parse(selectedLog.details), null, 2) 
                    : '// No additional details recorded.'}
               </pre>
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-10 h-12 shadow-lg shadow-indigo-100"
                onClick={() => setSelectedLog(null)}
              >
                Close Trace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
