'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ClipboardCheck, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Send,
  AlertTriangle,
  ChevronRight,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const AUDIT_AREAS = ['Line-01', 'Line-02', 'Warehouse-A', 'Testing-Zone'];
const CHECK_ITEMS = [
  { id: '5s', label: '5S Compliance (Cleanliness)', type: 'QUALITY' },
  { id: 'safety', label: 'Safety Hazards Check', type: 'OTHER' },
  { id: 'equip', label: 'Equipment Status & Noise', type: 'EQUIPMENT' },
  { id: 'sop', label: 'Operator Following SOP', type: 'PROCESS' }
];

export default function MobileAuditPage() {
  const t = useTranslations('Execution');
  const [selectedArea, setSelectedArea] = useState('');
  const [results, setResults] = useState<Record<string, 'PASS' | 'FAIL'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failDescription, setFailDescription] = useState('');

  const toggleResult = (id: string, res: 'PASS' | 'FAIL') => {
    setResults(prev => ({ ...prev, [id]: res }));
  };

  const handleSubmit = async () => {
    if (!selectedArea) {
      toast.error('Please select an audit area first.');
      return;
    }
    if (Object.keys(results).length < CHECK_ITEMS.length) {
      toast.error('Please complete all check items.');
      return;
    }

    setIsSubmitting(true);
    const hasFail = Object.values(results).includes('FAIL');
    
    try {
      const res = await fetch('/api/quality/mobile-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: selectedArea,
          checks: results,
          triggeredIssue: hasFail ? {
            type: CHECK_ITEMS.find(i => results[i.id] === 'FAIL')?.type || 'OTHER',
            description: failDescription || 'Audit failure identified during Gemba walk.'
          } : null
        })
      });

      if (res.ok) {
        toast.success('Gemba Audit Recorded successfully.');
        setResults({});
        setSelectedArea('');
        setFailDescription('');
      }
    } catch (err) {
      toast.error('Sync failed. Please check network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl">
      {/* Mobile Header */}
      <div className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-3">
              <div className="size-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                 <ClipboardCheck className="size-6" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight">Gemba Audit</h1>
           </div>
           <History className="size-5 text-slate-500" />
        </div>
        <p className="text-slate-400 text-xs font-medium italic">Record site conditions & trigger immediate Andon calls.</p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Area Selection */}
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="size-3" /> Select Audit Zone
           </label>
           <div className="grid grid-cols-2 gap-2">
              {AUDIT_AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                    selectedArea === area 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : 'bg-white border-slate-100 text-slate-500'
                  }`}
                >
                  {area}
                </button>
              ))}
           </div>
        </div>

        {/* Check Items */}
        <div className="space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="size-3" /> Checklist
           </label>
           {CHECK_ITEMS.map(item => (
             <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                   <span className="text-sm font-bold text-slate-700">{item.label}</span>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => toggleResult(item.id, 'PASS')}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                          results[item.id] === 'PASS' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300'
                        }`}
                      >
                         <CheckCircle2 className="size-5" />
                      </button>
                      <button 
                        onClick={() => toggleResult(item.id, 'FAIL')}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                          results[item.id] === 'FAIL' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-300'
                        }`}
                      >
                         <XCircle className="size-5" />
                      </button>
                   </div>
                </CardContent>
             </Card>
           ))}
        </div>

        {/* Conditional Fail Input */}
        {Object.values(results).includes('FAIL') && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
             <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="size-3" /> Failure Details (Will Trigger Andon)
             </label>
             <textarea 
               className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-sm font-medium text-slate-700 placeholder:text-rose-300 focus:ring-2 focus:ring-rose-500 outline-none"
               placeholder="Describe the issue observed..."
               rows={3}
               value={failDescription}
               onChange={e => setFailDescription(e.target.value)}
             />
          </div>
        )}

        {/* Simulated Photo Capture */}
        <div className="p-4 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-2 text-slate-400 group cursor-pointer hover:bg-slate-200 transition-colors">
           <Camera className="size-6" />
           <span className="text-[10px] font-black uppercase">Attach Evidence Photo</span>
        </div>
      </div>

      {/* Footer Button */}
      <div className="p-6 bg-white border-t border-slate-100">
        <Button 
          className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${
            isSubmitting ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'SYNCING...' : 'Submit Audit Findings'}
          <Send className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
