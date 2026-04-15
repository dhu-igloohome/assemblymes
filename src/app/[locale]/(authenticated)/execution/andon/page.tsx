'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Activity,
  AlertOctagon,
  Wrench,
  Package,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface IssueRecord {
  id: string;
  issueType: 'MATERIAL' | 'QUALITY' | 'EQUIPMENT' | 'PROCESS' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  workCenterCode: string | null;
  reporter: string;
  reportedAt: string;
  workOrder?: { workOrderNo: string };
  operation?: { operationName: string };
}

export default function AndonBoardPage() {
  const t = useTranslations('Execution');
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchIssues = useCallback(async () => {
    try {
      const res = await fetch('/api/execution/issues?status=OPEN,IN_PROGRESS', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch (error) {
      console.error('Failed to fetch andon issues:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIssues();
    const timer = setInterval(() => {
      void fetchIssues();
      setCurrentTime(new Date());
    }, 5000); // Refresh data every 5s (Critical for Andon)
    return () => clearInterval(timer);
  }, [fetchIssues]);

  // Calculate statistics
  const stats = useMemo(() => {
    const open = issues.filter(i => i.status === 'OPEN').length;
    const inProgress = issues.filter(i => i.status === 'IN_PROGRESS').length;
    
    // Categorized statistics
    const byType = {
      MATERIAL: issues.filter(i => i.issueType === 'MATERIAL').length,
      QUALITY: issues.filter(i => i.issueType === 'QUALITY').length,
      EQUIPMENT: issues.filter(i => i.issueType === 'EQUIPMENT').length,
      PROCESS: issues.filter(i => i.issueType === 'PROCESS').length,
      OTHER: issues.filter(i => i.issueType === 'OTHER').length,
    };

    return { open, inProgress, byType, total: issues.length };
  }, [issues]);

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'MATERIAL': return <Package className="size-6 text-blue-400" />;
      case 'QUALITY': return <ShieldAlert className="size-6 text-red-400" />;
      case 'EQUIPMENT': return <Wrench className="size-6 text-orange-400" />;
      case 'PROCESS': return <Activity className="size-6 text-purple-400" />;
      default: return <AlertOctagon className="size-6 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-600 animate-pulse';
      case 'IN_PROGRESS': return 'bg-amber-500';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 font-sans">
      {/* {t('Header')} */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg">
            <AlertTriangle className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">{t('andon_board')}</h1>
            <p className="text-slate-500 font-mono">{currentTime.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-slate-500 text-sm uppercase tracking-widest">{t('issue_status_open')}</p>
            <p className="text-5xl font-black text-red-500">{stats.open}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-sm uppercase tracking-widest">{t('issue_status_in_progress')}</p>
            <p className="text-5xl font-black text-amber-500">{stats.inProgress}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1">
        {/* {t('left_active_issues')} */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="size-5 text-red-500" />
              {t('andon_active_issues')}
            </h2>
          </div>

          <div className="grid gap-4 overflow-y-auto">
            {issues.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-20 flex flex-col items-center justify-center text-slate-500 italic">
                <CheckCircle2 className="size-16 text-emerald-500/20 mb-4" />
                <p className="text-2xl">{t('andon_no_active')}</p>
              </div>
            ) : (
              issues.map((issue) => (
                <div 
                  key={issue.id} 
                  className={`border-l-8 ${issue.status === 'OPEN' ? 'border-red-600 bg-red-950/20' : 'border-amber-500 bg-amber-950/20'} rounded-r-2xl p-6 flex items-center gap-6 shadow-2xl transition-all border-y border-r border-slate-800`}
                >
                  <div className="bg-slate-900 p-4 rounded-xl shadow-inner">
                    {getIssueIcon(issue.issueType)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded text-xs font-black uppercase ${getStatusColor(issue.status)}`}>
                        {t(`issue_status_${issue.status.toLowerCase()}` as any)}
                      </span>
                      <span className="text-slate-400 font-mono text-sm">{new Date(issue.reportedAt).toLocaleTimeString()}</span>
                    </div>
                    <h3 className="text-2xl font-bold">
                      {issue.workOrder?.workOrderNo} <ArrowRight className="inline size-5 text-slate-600" /> {issue.operation?.operationName}
                    </h3>
                    <p className="text-slate-300 text-lg leading-tight">{issue.description}</p>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{t('workstation')}</p>
                      <p className="text-xl font-black text-slate-200">{issue.workCenterCode || '—'}</p>
                    </div>
                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{t('issue_reporter')}</p>
                      <p className="text-lg font-bold text-slate-200">{issue.reporter}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* {t('right_stats')} */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          {/* {t('andon_type_distribution')} */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="size-5 text-indigo-400" />
              {t('andon_type_distribution')}
            </h2>
            
            <div className="space-y-4">
              {[
                { type: 'QUALITY', label: t('issue_type_quality'), color: 'bg-red-500' },
                { type: 'MATERIAL', label: t('issue_type_material'), color: 'bg-blue-500' },
                { type: 'EQUIPMENT', label: t('issue_type_equipment'), color: 'bg-orange-500' },
                { type: 'PROCESS', label: t('issue_type_process'), color: 'bg-purple-500' },
                { type: 'OTHER', label: t('issue_type_other'), color: 'bg-slate-500' },
              ].map((item) => {
                const count = (stats.byType as any)[item.type] || 0;
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={item.type} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-200">{count}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-500`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* {t('productivity_guard')} */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 flex-1 flex flex-col justify-between">
            <div>
              <AlertOctagon className="size-12 text-indigo-400 mb-4" />
              <h2 className="text-3xl font-black text-white mb-2 leading-none">{t('guard_title_line1')}<br/>{t('guard_title_line2')}</h2>
              <p className="text-slate-400">{t('andon_desc')}</p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-indigo-500/20">
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="size-3 bg-emerald-500 rounded-full animate-ping" />
                <span className="font-mono font-bold tracking-tighter">{t('system_active')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
