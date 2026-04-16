'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Fingerprint, 
  Search, 
  History, 
  Cpu, 
  ShieldCheck, 
  Box, 
  ArrowRight, 
  Clock,
  Layers,
  User,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface TraceData {
  identity: { sn: string; btId: string; sku: string; batch: string; bornAt: string };
  process: Array<{ id: string; name: string; station: string; status: string; reports: any[] }>;
  quality: Array<{ id: string; stage: string; result: string; inspector: string; time: string }>;
  materials: Array<{ name: string; batch: string; provider: string }>;
}

export default function TraceabilityPage() {
  const t = useTranslations('Execution');
  const [sn, setSn] = useState('');
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (searchSn?: string) => {
    const targetSn = searchSn || sn;
    if (!targetSn) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/execution/traceability/${targetSn}`, { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast.error('Unit DNA not found. Ensure SN is correctly scanned.');
        setData(null);
      }
    } catch (err) {
      toast.error('Traceability engine is offline.');
    } finally {
      setLoading(false);
    }
  }, [sn]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Search Header */}
      <div className="max-w-4xl mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
             <Fingerprint className="size-10 text-indigo-600" />
             DIGITAL DNA EXPLORER
          </h1>
          <p className="text-slate-500 font-medium italic">End-to-End Product Genealogy & Lifecycle Traceability</p>
        </div>

        <div className="relative group max-w-2xl mx-auto">
          <Input 
            className="h-16 pl-14 pr-32 bg-white border-none shadow-2xl rounded-2xl text-lg font-bold placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
            placeholder="Scan or enter Unit Serial Number (SN)..."
            value={sn}
            onChange={e => setSn(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Search className="absolute left-5 top-5 size-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <Button 
            className="absolute right-3 top-3 h-10 px-6 bg-slate-900 hover:bg-black text-white font-black rounded-xl"
            onClick={() => handleSearch()}
            disabled={loading}
          >
            {loading ? 'TRACING...' : 'SEARCH'}
          </Button>
        </div>
      </div>

      {data ? (
        <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Left: Identity Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-slate-900 text-white">
              <CardHeader className="bg-indigo-600 pb-8">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/20 rounded-2xl border border-white/10">
                       <Cpu className="size-6" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-500/30 uppercase tracking-widest">Active DNA</span>
                 </div>
                 <CardTitle className="text-2xl font-black mt-4 uppercase tracking-tighter">{data.identity.sn}</CardTitle>
                 <CardDescription className="text-indigo-100 font-mono text-xs">{data.identity.sku} | Batch: {data.identity.batch}</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Born At</p>
                       <p className="text-xs font-bold">{new Date(data.identity.bornAt).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bluetooth ID</p>
                       <p className="text-xs font-bold font-mono">{data.identity.btId}</p>
                    </div>
                 </div>
                 <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Database className="size-4 text-indigo-400" />
                       <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Global Identity Link</span>
                    </div>
                    <ExternalLink className="size-4 text-slate-500" />
                 </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-[32px] bg-white p-8 space-y-6">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="size-4 text-emerald-500" />
                  Bill of Materials DNA
               </h3>
               <div className="space-y-3">
                  {data.materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                       <div className="size-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-emerald-500 transition-colors">
                          <Box className="size-5" />
                       </div>
                       <div className="flex-1">
                          <p className="text-xs font-black text-slate-800 uppercase">{m.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Lot: {m.batch} • {m.provider}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
          </div>

          {/* Right: Timeline DNA */}
          <div className="lg:col-span-8 space-y-8">
            <div className="relative pl-8 space-y-12 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 before:dashed">
               {/* Process Steps */}
               {data.process.map((op, idx) => (
                 <div key={idx} className="relative group">
                    <div className={`absolute -left-8 top-1 size-6 rounded-full border-4 border-white shadow-sm z-10 transition-colors ${op.status === 'COMPLETED' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step {idx + 1} • {op.station}</p>
                             <h4 className="text-lg font-black text-slate-900 uppercase">{op.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${op.status === 'COMPLETED' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                             {op.status}
                          </span>
                       </div>
                       
                       {op.reports.length > 0 && (
                         <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                               <User className="size-3 text-slate-400" />
                               <span className="text-[10px] font-bold text-slate-600 uppercase">{op.reports[0].operator}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <Clock className="size-3 text-slate-400" />
                               <span className="text-[10px] font-bold text-slate-600 uppercase">{new Date(op.reports[0].createdAt).toLocaleTimeString()}</span>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>
               ))}

               {/* Quality Milestone */}
               <div className="relative group">
                  <div className="absolute -left-8 top-1 size-6 rounded-full border-4 border-white bg-emerald-500 shadow-sm z-10" />
                  <div className="bg-emerald-50/50 p-6 rounded-[24px] border border-emerald-100">
                     <h4 className="text-sm font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheck className="size-4" /> Final Quality Verdict
                     </h4>
                     <div className="grid gap-3 md:grid-cols-2">
                        {data.quality.map((q, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm flex items-center justify-between">
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{q.stage}</p>
                                <p className="text-xs font-bold text-slate-700 uppercase">Inspector: {q.inspector || 'SYSTEM'}</p>
                             </div>
                             <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-tighter">{q.result}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center py-32 text-center">
           <div className="size-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-6">
              <History className="size-12 text-slate-100" />
           </div>
           <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Awaiting Identity Input</h3>
           <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">Please enter a unit serial number to visualize its complete manufacturing genealogy and quality history.</p>
        </div>
      )}
    </div>
  );
}
