'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  AlertTriangle, 
  Truck, 
  PackageSearch, 
  Zap, 
  ArrowRight, 
  ShieldAlert,
  CalendarClock,
  Sparkles,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RiskData {
  risks: Array<{
    itemCode: string;
    itemName: string;
    onHand: number;
    inTransit: number;
    demand: number;
    safetyStock: number;
    balance: number;
    status: 'WARNING' | 'CRITICAL';
    supplier: string;
    riskDays: number;
  }>;
  aiRecommendations: Array<{ id: number; item: string; action: string; priority: string }>;
}

export default function SupplyRisksPage() {
  const t = useTranslations('Dashboard');
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRisks = useCallback(async () => {
    try {
      const res = await fetch('/api/supply-chain/risks', { cache: 'no-store' });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      toast.error('Supply chain scan failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRisks();
  }, [fetchRisks]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black animate-pulse text-indigo-600 uppercase tracking-widest">Scanning Global Supply Chain...</div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Truck className="size-8 text-indigo-600" />
              Supply Chain Synergy
           </h1>
           <p className="text-slate-500 font-medium italic mt-1">Cross-functional risk scouting: Inventory vs. Demand vs. Lead Times</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl" onClick={() => void fetchRisks()}>
           Refresh Scouter
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto">
         {/* Left: Risk Heatmap List */}
         <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
               <CardHeader className="bg-slate-900 text-white pb-8">
                  <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                     <ShieldAlert className="size-5 text-rose-500" />
                     Critical Shortage Radar
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-medium">Items requiring immediate procurement intervention</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                     {data?.risks.map((risk, i) => (
                       <div key={i} className="p-6 flex items-center gap-8 group hover:bg-slate-50 transition-colors">
                          <div className={`size-14 rounded-2xl flex items-center justify-center shadow-inner ${
                            risk.status === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                             <PackageSearch className="size-6" />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                             <div className="flex items-center gap-3">
                                <h4 className="text-sm font-black text-slate-900 uppercase">{risk.itemName}</h4>
                                <span className="text-[10px] font-bold text-slate-400 font-mono">{risk.itemCode}</span>
                             </div>
                             <div className="flex gap-4">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                   In Stock: <span className="text-slate-900">{risk.onHand}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                   Pending Demand: <span className="text-slate-900">{risk.demand}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                   Risk Balance: <span className={risk.balance < 0 ? 'text-rose-600' : 'text-amber-600'}>{risk.balance}</span>
                                </div>
                             </div>
                          </div>

                          <div className="text-right space-y-1">
                             <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                               risk.status === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                             }`}>
                                {risk.status}
                             </div>
                             {risk.riskDays > 0 && (
                               <p className="text-[10px] font-black text-rose-500 flex items-center justify-end gap-1">
                                  <CalendarClock className="size-3" /> Stop Line in {risk.riskDays}D
                               </p>
                             )}
                          </div>
                       </div>
                     ))}
                     {data?.risks.length === 0 && (
                        <div className="py-20 text-center text-slate-300 italic font-black uppercase tracking-widest">No Supply Risks Detected</div>
                     )}
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Right: AI Intelligence Column */}
         <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl rounded-[32px] bg-slate-900 text-white p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles className="size-24" />
               </div>
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-900/40"><Zap className="size-4" /></div>
                     <h3 className="text-lg font-black uppercase">Supply AI Intelligence</h3>
                  </div>
                  
                  <div className="space-y-6">
                     {data?.aiRecommendations.map((rec) => (
                       <div key={rec.id} className="space-y-2 group cursor-pointer">
                          <div className="flex justify-between items-center">
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                               rec.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                             }`}>{rec.priority} PRIORITY</span>
                             <ArrowRight className="size-3 text-slate-600 group-hover:text-white transition-colors" />
                          </div>
                          <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{rec.action}</p>
                       </div>
                     ))}
                  </div>

                  <Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest mt-4">
                     Execute Synergy Plan
                  </Button>
               </div>
            </Card>

            <Card className="border-none shadow-lg rounded-[32px] bg-white p-8 space-y-6">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="size-4 text-indigo-500" />
                  Cost Impact Prediction
               </h3>
               <div className="flex items-end gap-3">
                  <TrendingDown className="size-10 text-rose-500" />
                  <div>
                     <p className="text-2xl font-black text-slate-900 tracking-tighter">-4.2%</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Est. Margin Impact</p>
                  </div>
               </div>
               <p className="text-[10px] text-slate-500 leading-tight">Shortages in high-value components (CPU-01) may force emergency air freight, impacting unit gross margin by 4.2% if not resolved by EOW.</p>
            </Card>
         </div>
      </div>
    </div>
  );
}
