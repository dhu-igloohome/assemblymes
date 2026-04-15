'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Box, 
  Clock,
  ArrowUpRight,
  Monitor
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CockpitData {
  todayOutput: number;
  yieldRate: number;
  activeIssues: number;
  outputTrend: number[];
  recentEvents: { id: string; time: string; event: string; type: string }[];
}

interface KpiCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend: string;
}

export default function CockpitPage() {
  const t = useTranslations('Execution');
  const [data, setData] = useState<CockpitData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      // Aggregate data from existing APIs for cockpit view
      const [sumRes, issueRes] = await Promise.all([
        fetch('/api/system/dashboard-summary', { cache: 'no-store' }),
        fetch('/api/execution/issues?status=OPEN,IN_PROGRESS', { cache: 'no-store' })
      ]);

      if (sumRes.ok && issueRes.ok) {
        const sum = await sumRes.json();
        const issues = await issueRes.json();
        
        setData({
          todayOutput: sum.todayOutput,
          yieldRate: 98.4, // Mocked for visuals
          activeIssues: issues.length,
          outputTrend: [65, 78, 82, 75, 90, 85, 95], // Mocked trend
          recentEvents: issues.slice(0, 5).map((i: any) => ({
            id: i.id,
            time: new Date(i.reportedAt).toLocaleTimeString(),
            event: `${i.issueType}: ${i.description}`,
            type: i.status
          }))
        });
      }
    } catch (error) {
      console.error('Cockpit fetch failed:', error);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(() => {
      void fetchData();
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (!data) return <div className="min-h-screen bg-black flex items-center justify-center text-indigo-500 font-black animate-pulse">BOOTING COMMAND CENTER...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans overflow-hidden flex flex-col gap-8">
      {/* Cinematic Header */}
      <div className="flex justify-between items-end border-b-2 border-indigo-500/20 pb-6">
        <div className="flex items-center gap-6">
          <div className="size-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)]">
            <Monitor className="size-10 text-white" />
          </div>
          <div>
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Operation Cockpit</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/30 flex items-center gap-2">
                <div className="size-2 bg-emerald-500 rounded-full animate-ping" />
                SYSTEM LIVE
              </span>
              <span className="text-slate-500 font-mono font-bold tracking-widest">{currentTime.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Workshop Zone</p>
          <p className="text-4xl font-black text-indigo-400">MAIN ASSEMBLY - A</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-3 gap-8">
        <KpiCard 
          label="Today Output" 
          value={data.todayOutput.toString()} 
          unit="PCS" 
          icon={<Box className="size-8" />} 
          color="text-indigo-500"
          trend="+12%"
        />
        <KpiCard 
          label="Quality Yield" 
          value={data.yieldRate.toString()} 
          unit="%" 
          icon={<ShieldCheck className="size-8" />} 
          color="text-emerald-500"
          trend="STABLE"
        />
        <KpiCard 
          label="Active Anomalies" 
          value={data.activeIssues.toString()} 
          unit="ALERTS" 
          icon={<AlertTriangle className="size-8" />} 
          color={data.activeIssues > 0 ? "text-red-500" : "text-slate-500"}
          trend={data.activeIssues > 0 ? "ACTION REQ" : "NORMAL"}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Output Trend Visualization */}
        <div className="col-span-8 bg-slate-900/40 border border-white/5 rounded-[40px] p-10 flex flex-col gap-6">
           <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase flex items-center gap-3">
                <TrendingUp className="size-6 text-indigo-400" />
                Hourly Productivity Flow
              </h3>
              <div className="flex gap-2">
                 {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map(t => (
                   <span key={t} className="text-[10px] font-black text-slate-600">{t}</span>
                 ))}
              </div>
           </div>
           <div className="flex-1 flex items-end gap-3 pb-4">
              {data.outputTrend.map((v, i) => (
                <div key={i} className="flex-1 group relative">
                   <div 
                     className="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl transition-all duration-1000"
                     style={{ height: `${v}%` }}
                   />
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {v}%
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Real-time Event Stream */}
        <div className="col-span-4 bg-slate-900/40 border border-white/5 rounded-[40px] p-8 flex flex-col gap-6">
           <h3 className="text-xl font-black uppercase flex items-center gap-3">
              <Activity className="size-5 text-red-500" />
              Critical Events
           </h3>
           <div className="flex-1 space-y-4 overflow-hidden">
              {data.recentEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic font-black text-sm uppercase">No critical events reported</div>
              ) : data.recentEvents.map(event => (
                <div key={event.id} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-colors">
                   <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-500 font-mono">{event.time}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${event.type === 'OPEN' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-300 line-clamp-1">{event.event}</p>
                   </div>
                   <ArrowUpRight className="size-5 text-slate-600 group-hover:text-white transition-colors" />
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, icon, color, trend }: KpiCardProps) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[40px] p-8 flex items-center gap-8 hover:bg-slate-900/60 transition-colors group">
      <div className={`size-20 bg-white/5 rounded-3xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform shadow-inner`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
           <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{label}</p>
           <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 ${trend === 'STABLE' ? 'text-emerald-400' : 'text-indigo-400'}`}>
             {trend}
           </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
           <span className={`text-6xl font-black tracking-tighter ${color}`}>{value}</span>
           <span className="text-slate-500 text-lg font-black">{unit}</span>
        </div>
      </div>
    </div>
  );
}
