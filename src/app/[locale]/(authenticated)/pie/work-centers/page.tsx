'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { WorkCenterType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  LayoutGrid, 
  Cpu, 
  Plus, 
  Save, 
  Trash2, 
  Search,
  Zap,
  Calendar,
  Settings2,
  Activity,
  ArrowRight,
  Monitor
} from 'lucide-react';
import { WORK_CENTER_TYPE_OPTIONS } from '@/lib/work-center';

interface WorkCenterRow {
  id: string;
  workCenterCode: string;
  name: string;
  type: WorkCenterType;
  dailyCapacity: number | null;
}

export default function WorkCentersPage() {
  const t = useTranslations('WorkCenters');
  const [rows, setRows] = useState<WorkCenterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [wcType, setWcType] = useState<WorkCenterType>('FLOW_LINE');
  const [dailyCapacity, setDailyCapacity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/work-centers', { cache: 'no-store' });
      if (!res.ok) {
        setRows([]);
        setListError(t('load_failed'));
        return;
      }
      const data = (await res.json()) as WorkCenterRow[];
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

  const resetForm = () => {
    setCode('');
    setName('');
    setWcType('FLOW_LINE');
    setDailyCapacity('');
    setDialogError('');
    setEditingId(null);
  };

  const openCreate = () => {
    setDialogMode('create');
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: WorkCenterRow) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setCode(row.workCenterCode);
    setName(row.name);
    setWcType(row.type);
    setDailyCapacity(row.dailyCapacity === null ? '' : String(row.dailyCapacity));
    setDialogError('');
    setDialogOpen(true);
  };

  const submitWorkCenter = async () => {
    setDialogError('');
    setListMessage('');
    setListError('');
    setIsSubmitting(true);
    try {
      if (dialogMode === 'create') {
        const body: Record<string, unknown> = {
          workCenterCode: code.trim(),
          name: name.trim(),
          type: wcType,
        };
        if (dailyCapacity.trim() !== '') {
          body.dailyCapacity = Number.parseInt(dailyCapacity, 10);
        } else {
          body.dailyCapacity = null;
        }
        const res = await fetch('/api/work-centers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
        if (!res.ok) {
          const err = payload?.error;
          const errorKeyByCode: Record<string, string> = {
            INVALID_WORK_CENTER_CODE: 'invalid_work_center_code',
            WORK_CENTER_NAME_REQUIRED: 'work_center_name_required',
            INVALID_WORK_CENTER_TYPE: 'invalid_work_center_type',
            INVALID_DAILY_CAPACITY: 'invalid_daily_capacity_value',
            WORK_CENTER_CODE_DUPLICATE: 'work_center_code_already_exists',
          };
          setDialogError(err && errorKeyByCode[err] ? t(errorKeyByCode[err]) : t('save_failed'));
          return;
        }
        setListMessage(t('create_success'));
        setDialogOpen(false);
        resetForm();
        await loadRows();
        return;
      }

      if (!editingId) {
        return;
      }
      const body: Record<string, unknown> = {
        name: name.trim(),
        type: wcType,
      };
      if (dailyCapacity.trim() !== '') {
        body.dailyCapacity = Number.parseInt(dailyCapacity, 10);
      } else {
        body.dailyCapacity = null;
      }
      const res = await fetch(`/api/work-centers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
      if (!res.ok) {
        const err = payload?.error;
        const errorKeyByCode: Record<string, string> = {
          INVALID_WORK_CENTER_CODE: 'invalid_work_center_code',
          WORK_CENTER_NAME_REQUIRED: 'work_center_name_required',
          INVALID_WORK_CENTER_TYPE: 'invalid_work_center_type',
          INVALID_DAILY_CAPACITY: 'invalid_daily_capacity_value',
          WORK_CENTER_CODE_DUPLICATE: 'work_center_code_already_exists',
        };
        setDialogError(err && errorKeyByCode[err] ? t(errorKeyByCode[err]) : t('save_failed'));
        return;
      }
      setListMessage(t('update_success'));
      setDialogOpen(false);
      resetForm();
      await loadRows();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: WorkCenterRow) => {
    if (!window.confirm(t('delete_confirm'))) {
      return;
    }
    setListMessage('');
    setListError('');
    try {
      const res = await fetch(`/api/work-centers/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setListError(payload?.error ?? t('delete_failed'));
        return;
      }
      setListMessage(t('delete_success'));
      await loadRows();
    } catch {
      setListError(t('delete_failed'));
    }
  };

  const typeLabel = (type: WorkCenterType) =>
    type === 'FLOW_LINE' ? t('type_flow_line') : t('type_standalone');

  const filteredRows = rows.filter(r => 
    r.workCenterCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">工作中心管理</h1>
          <p className="text-slate-500 font-medium">Work Centers & Resource Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => loadRows()}>
            刷新
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={openCreate}>
            <Plus className="size-4 mr-2" /> 新增工作中心
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左侧：资源看板 */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <LayoutGrid className="size-5 text-indigo-400" />
                所有工作中心
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder="搜索编码或名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 italic">加载中...</div>
                ) : filteredRows.map((row) => (
                  <div 
                    key={row.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${editingId === row.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => openEdit(row)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.workCenterCode}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1 ${row.type === 'FLOW_LINE' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                        {row.type === 'FLOW_LINE' ? <Activity className="size-3" /> : <Monitor className="size-3" />}
                        {typeLabel(row.type)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{row.name}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Zap className="size-3" /> 日产能: {row.dailyCapacity ?? '未设置'}
                      </p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="xs" className="text-indigo-600 font-bold" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>编辑</Button>
                         <Button variant="ghost" size="xs" className="text-red-400 font-bold" onClick={(e) => { e.stopPropagation(); void handleDelete(row); }}>删除</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredRows.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">No results found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：资源详情/概览 */}
        <div className="lg:col-span-8 space-y-8">
           <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                       <Cpu className="size-6 text-indigo-600" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">总工作中心</p>
                       <p className="text-2xl font-black text-slate-900">{rows.length}</p>
                    </div>
                 </div>
              </Card>
              <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                       <Zap className="size-6 text-amber-600" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">平均日产能</p>
                       <p className="text-2xl font-black text-slate-900">
                         {rows.length > 0 ? (rows.reduce((acc, r) => acc + (r.dailyCapacity || 0), 0) / rows.length).toFixed(0) : 0}
                       </p>
                    </div>
                 </div>
              </Card>
           </div>

           <Card className="border-none shadow-sm rounded-[40px] p-12 bg-white overflow-hidden min-h-[400px]">
              <div className="flex flex-col items-center justify-center h-full">
                 {editingId ? (
                    <div className="w-full max-w-lg space-y-8">
                       <div className="text-center">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">编辑工作中心</h2>
                          <p className="text-slate-400 text-sm mt-1">更新资源配置与产能标准</p>
                       </div>
                       
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">资源编码</label>
                             <Input 
                               value={code} 
                               disabled 
                               className="h-12 bg-slate-50 border-none font-bold text-slate-400"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">中心名称</label>
                             <Input 
                               value={name} 
                               onChange={(e) => setName(e.target.value)}
                               className="h-12 bg-slate-50 border-none font-bold"
                               placeholder="如：1号总装线"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">资源类型</label>
                                <Select
                                  value={wcType}
                                  onValueChange={(v) => setWcType((v ?? 'FLOW_LINE') as WorkCenterType)}
                                >
                                  <SelectTrigger className="h-12 bg-slate-50 border-none font-bold">
                                    <SelectValue placeholder="类型" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WORK_CENTER_TYPE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt} value={opt} className="font-bold">
                                        {typeLabel(opt)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">日均产能(PCS)</label>
                                <Input 
                                  value={dailyCapacity} 
                                  onChange={(e) => setDailyCapacity(e.target.value)}
                                  className="h-12 bg-slate-50 border-none font-bold"
                                  placeholder="如：500"
                                />
                             </div>
                          </div>

                          {dialogError && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl">{dialogError}</p>}
                          {listMessage && <p className="text-xs font-bold text-emerald-500 bg-emerald-50 p-3 rounded-xl">{listMessage}</p>}

                          <Button 
                            className="w-full h-14 bg-slate-900 hover:bg-indigo-600 transition-all text-white font-black rounded-2xl shadow-xl shadow-slate-100"
                            onClick={() => void submitWorkCenter()}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? '正在提交...' : '更新资源配置'}
                          </Button>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center space-y-6">
                       <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                          <Settings2 className="size-10 text-slate-200" />
                       </div>
                       <div className="max-w-xs mx-auto">
                          <h3 className="text-lg font-black text-slate-300 uppercase tracking-tighter">资源配置中心</h3>
                          <p className="text-slate-400 text-xs mt-2">点击左侧列表中的工作中心进行详细配置，或点击右上角创建新的资源点。</p>
                       </div>
                    </div>
                 )}
              </div>
           </Card>
        </div>
      </div>

      {/* 创建对话框 */}
      <Dialog open={dialogOpen && dialogMode === 'create'} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">新增工作中心</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">定义新的生产资源点与产能基准</DialogDescription>
           </DialogHeader>
           <div className="space-y-6 mt-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">资源编码</label>
                 <Input 
                   value={code} 
                   onChange={(e) => setCode(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="如：LINE-01"
                   maxLength={16}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">中心名称</label>
                 <Input 
                   value={name} 
                   onChange={(e) => setName(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="如：1号总装线"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">资源类型</label>
                    <Select
                      value={wcType}
                      onValueChange={(v) => setWcType((v ?? 'FLOW_LINE') as WorkCenterType)}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-none font-bold">
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_CENTER_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt} className="font-bold">
                            {typeLabel(opt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">日均产能(PCS)</label>
                    <Input 
                      value={dailyCapacity} 
                      onChange={(e) => setDailyCapacity(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-bold"
                      placeholder="如：500"
                    />
                 </div>
              </div>
              {dialogError && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl">{dialogError}</p>}
              <Button 
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 mt-4"
                onClick={() => void submitWorkCenter()}
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '确认创建资源'}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

