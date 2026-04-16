'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Download, 
  Sparkles,
  ArrowUpRight,
  Target,
  Activity,
  Box,
  Layers,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SummaryData {
  summary: { totalProduction: number; activeOrders: number; yieldAvg: number; issueResolutionRate: number };
  trends: { labels: string[]; productivity: number[]; quality: number[] };
  risks: Array<{ level: string; category: string; desc: string }>;
  opportunities: Array<{ type: string; desc: string }>;
}

export default function ExecutiveReportPage() {
  const t = useTranslations('Dashboard');
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence/executive-summary', { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      toast.error('Strategic core data link failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black animate-pulse text-indigo-600">PREPARING STRATEGIC BRIEFING...</div>;
  if (!data) return null;

  return (
    <div className="p-8 space-y-10 bg-slate-50/50 min-h-screen">
      {/* Header with Export */}
      <div className="flex justify-between items-end max-w-7xl mx-auto">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Confidential</div>
            <span className="text-slate-400 font-mono text-xs uppercase tracking-tighter">Factory ID: MAIN-ASSEMBLY-01</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Strategic Operations Report
          </h1>
          <p className="text-slate-500 font-medium mt-3 italic max-w-xl">Comprehensive manufacturing intelligence for executive decision-making and operational excellence.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold text-slate-600">
            <Download className="size-4 mr-2" /> PDF Export
          </Button>
          <Button className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-widest shadow-xl">
             Live Broadcast
          </Button>
        </div>
      </div>

      {/* KPI Overlays */}
      <div className="grid gap-6 md:grid-cols-4 max-w-7xl mx-auto">
         <KpiMetric label="Total Production" value={data.summary.totalProduction.toLocaleString()} unit="Units" icon={<Box className="size-5" />} color="text-indigo-600" />
         <KpiMetric label="Operational Yield" value={`${data.summary.yieldAvg}%`} unit="Avg" icon={<ShieldCheck className="size-5" />} color="text-emerald-600" />
         <KpiMetric label="Active Work Orders" value={data.summary.activeOrders.toString()} unit="Open" icon={<Layers className="size-5" />} color="text-indigo-600" />
         <KpiMetric label="Issue Closure" value={`${data.summary.issueResolutionRate}%`} unit="Rate" icon={<Activity className="size-5" />} color="text-amber-600" />
      </div>

      {/* Strategic Trend Grid */}
      <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto">
         {/* Main Trends Chart */}
         <Card className="lg:col-span-8 border-none shadow-2xl rounded-[40px] bg-white p-10 flex flex-col gap-8">
            <div className="flex justify-between items-center">
               <div className="space-y-1">
                  <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                     <TrendingUp className="size-6 text-indigo-600" />
                     Productivity Velocity
                  </CardTitle>
                  <CardDescription className="text-slate-400">7-Day production output vs Target capacity</CardDescription>
               </div>
               <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2"><div className="size-2 bg-indigo-600 rounded-full" /> Actual</div>
                  <div className="flex items-center gap-2 text-slate-300"><div className="size-2 bg-slate-100 rounded-full" /> Target</div>
               </div>
            </div>
            
            <div className="flex-1 flex items-end gap-3 h-64 border-b border-slate-100 pb-2">
               {data.trends.productivity.map((v, i) => (
                 <div key={i} className="flex-1 group relative flex flex-col justify-end gap-2">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                       {v}% Capacity
                    </div>
                    <div 
                      className="bg-indigo-600 rounded-t-xl transition-all duration-1000 group-hover:bg-indigo-500"
                      style={{ height: `${v}%` }}
                    />
                    <div className="text-[10px] font-black text-slate-400 text-center uppercase mt-2">{data.trends.labels[i].split('/')[1]}nd</div>
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Week-over-Week Change</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-emerald-500">+12.4%</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Improved Velocity</span>
                  </div>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Achievement</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-slate-900">92%</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">On-track for Month</span>
                  </div>
               </div>
            </div>
         </Card>

         {/* AI Strategy Insights Column */}
         <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl rounded-[40px] bg-slate-900 text-white p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles className="size-24" />
               </div>
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-500 rounded-lg"><Zap className="size-4" /></div>
                     <h3 className="text-lg font-black uppercase">AI Core Insights</h3>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Key Risks</p>
                        {data.risks.map((r, i) => (
                           <div key={i} className="flex gap-3 items-start">
                              <div className={`mt-1 size-1.5 rounded-full shrink-0 ${r.level === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <p className="text-xs font-bold text-slate-300 leading-snug"><span className="text-white uppercase mr-1">[{r.category}]</span> {r.desc}</p>
                           </div>
                        ))}
                     </div>

                     <div className="space-y-3 border-t border-white/5 pt-6">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Strategic Opportunities</p>
                        {data.opportunities.map((o, i) => (
                           <div key={i} className="flex gap-3 items-start">
                              <ArrowUpRight className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-xs font-bold text-slate-300 leading-snug">{o.desc}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest">
                     Initiate Optimization Plan
                  </Button>
               </div>
            </Card>

            <Card className="border-none shadow-lg rounded-[40px] bg-white p-8 space-y-4 border border-slate-100">
               <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                     <Target className="size-4 text-rose-500" />
                     FPY Stability
                  </h3>
                  <span className="text-2xl font-black text-emerald-500">98.4%</span>
               </div>
               <p className="text-[10px] text-slate-500 leading-tight">First Pass Yield has shown high stability this month. AI predicts a continued trend of 98%+ based on current incoming material quality logs.</p>
            </Card>
         </div>
      </div>
    </div>
  );
}

function KpiMetric({ label, value, unit, icon, color }: { label: string; value: string; unit: string; icon: any; color: string }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-xl transition-all rounded-[32px] bg-white p-6 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-slate-50 ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <ArrowUpRight className="size-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
      </div>
    </Card>
  );
}
