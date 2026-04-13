'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronRight, 
  Award, 
  TrendingUp, 
  Briefcase, 
  Settings2, 
  History, 
  LayoutGrid,
  Zap,
  Star,
  ShieldCheck,
  Target
} from 'lucide-react';

interface EmployeeRow {
  id: string;
  employeeNo: string;
  name: string;
  team: string;
  skills: string[];
  skillMatrix: string | null;
}

export default function EmployeesPage() {
  const t = useTranslations('Employees');
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listMessage, setListMessage] = useState('');
  const [listError, setListError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [skills, setSkills] = useState(''); // Comma separated for input
  const [skillMatrix, setSkillMatrix] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' });
      if (!res.ok) {
        setRows([]);
        setListError(t('load_failed'));
        return;
      }
      const data = (await res.json()) as EmployeeRow[];
      setRows(data);
      if (data.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(data[0].id);
      }
    } catch {
      setRows([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, selectedEmployeeId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const resetForm = () => {
    setEmployeeNo('');
    setName('');
    setTeam('');
    setSkills('');
    setSkillMatrix('');
    setDialogError('');
    setEditingId(null);
  };

  const openCreate = () => {
    setDialogMode('create');
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: EmployeeRow) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setEmployeeNo(row.employeeNo);
    setName(row.name);
    setTeam(row.team);
    setSkills(row.skills.join(', '));
    setSkillMatrix(row.skillMatrix ?? '');
    setDialogError('');
    setDialogOpen(true);
  };

  const teamOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.team.trim()).filter(Boolean))).sort(),
    [rows]
  );

  const employeeNameOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.name.trim()).filter(Boolean))).sort(),
    [rows]
  );

  const skillOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => (row.skillMatrix ?? '').trim()).filter(Boolean))
      ).sort(),
    [rows]
  );

  const submitEmployee = async () => {
    setDialogError('');
    setListMessage('');
    setListError('');
    setIsSubmitting(true);
    try {
      if (dialogMode === 'create') {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeNo: employeeNo.trim().toUpperCase(),
            name: name.trim(),
            team: team.trim(),
            skills: skills.split(',').map(s => s.trim()).filter(Boolean),
            skillMatrix: skillMatrix.trim(),
          }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          const errorKeyByCode: Record<string, string> = {
            EMPLOYEE_NO_INVALID: 'employee_no_invalid',
            EMPLOYEE_NAME_REQUIRED: 'employee_name_required',
            EMPLOYEE_TEAM_REQUIRED: 'employee_team_required',
            EMPLOYEE_NO_DUPLICATE: 'employee_no_duplicate',
          };
          const code = payload?.error ?? '';
          setDialogError(errorKeyByCode[code] ? t(errorKeyByCode[code]) : t('save_failed'));
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

      const res = await fetch(`/api/employees/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          team: team.trim(),
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          skillMatrix: skillMatrix.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const errorKeyByCode: Record<string, string> = {
          EMPLOYEE_NAME_REQUIRED: 'employee_name_required',
          EMPLOYEE_TEAM_REQUIRED: 'employee_team_required',
          EMPLOYEE_NOT_FOUND: 'employee_not_found',
        };
        const code = payload?.error ?? '';
        setDialogError(errorKeyByCode[code] ? t(errorKeyByCode[code]) : t('save_failed'));
        return;
      }
      setListMessage(t('update_success'));
      setDialogOpen(false);
      resetForm();
      await loadRows();
    } catch {
      setDialogError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: EmployeeRow) => {
    if (!window.confirm(t('delete_confirm'))) {
      return;
    }
    setListMessage('');
    setListError('');
    try {
      const res = await fetch(`/api/employees/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setListError(t('delete_failed'));
        return;
      }
      setListMessage(t('delete_success'));
      await loadRows();
    } catch {
      setListError(t('delete_failed'));
    }
  };

  const selectedEmployee = useMemo(
    () => rows.find((r) => r.id === selectedEmployeeId) ?? null,
    [rows, selectedEmployeeId]
  );

  const filteredRows = rows.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.employeeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('center_title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadRows()}>
            {t('Common.refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={openCreate}>
            <UserPlus className="size-4 mr-2" /> {t('btn_add')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="size-5 text-indigo-400" />
                {t('list_title')}
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 italic">{t('Common.loading')}</div>
                ) : filteredRows.map((row) => (
                  <div 
                    key={row.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedEmployeeId === row.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedEmployeeId(row.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.employeeNo}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter">
                        {row.team}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{row.name}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex gap-1 overflow-hidden">
                         {row.skills.slice(0, 3).map(skill => (
                           <span key={skill} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded uppercase border border-slate-100">{skill}</span>
                         ))}
                         {row.skills.length > 3 && <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">+{row.skills.length - 3}</span>}
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredRows.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('no_personnel')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_console')} */}
        <div className="lg:col-span-8 space-y-8">
          {selectedEmployee ? (
            <>
              {/* {t('core_overview')} */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 col-span-2">
                   <div className="size-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                      {selectedEmployee.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedEmployee.name}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedEmployee.team} | {selectedEmployee.employeeNo}</p>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('matrix_level')}</label>
                  <div className="flex items-center gap-2">
                    <Star className="size-4 text-amber-500 fill-amber-500" />
                    <p className="text-sm font-bold text-slate-900">{selectedEmployee.skillMatrix || t('not_evaluated')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest" onClick={() => openEdit(selectedEmployee)}>
                    <Settings2 className="size-4 mr-2" /> {t('Common.edit')}
                  </Button>
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest border-red-100 text-red-500 hover:bg-red-50" onClick={() => void handleDelete(selectedEmployee)}>
                    {t('btn_remove')}
                  </Button>
                </div>
              </div>

              {listError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{listError}</div>}
              {listMessage && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{listMessage}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="profile" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Briefcase className="size-4 mr-2" /> {t('tab_skills')}
                  </TabsTrigger>
                  <TabsTrigger value="achievements" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Award className="size-4 mr-2" /> {t('tab_achievements')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> {t('tab_history')}
                  </TabsTrigger>
                </TabsList>

                {/* {t('tab_skills')} */}
                <TabsContent value="profile" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Target className="size-4 text-indigo-600" />
                            {t('skill_tree')}
                         </h3>
                         <div className="flex flex-wrap gap-3">
                            {selectedEmployee.skills.length > 0 ? selectedEmployee.skills.map((skill) => (
                               <div key={skill} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                                  <ShieldCheck className="size-3 text-emerald-500" />
                                  <span className="text-xs font-black text-slate-700 uppercase">{skill}</span>
                               </div>
                            )) : (
                               <p className="text-xs italic text-slate-400">{t('no_skills')}</p>
                            )}
                         </div>
                      </Card>

                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">{t('matrix_desc')}</h3>
                            <div className="space-y-4">
                               <p className="text-xs text-slate-400 leading-relaxed">
                                  {t('matrix_desc_text', { team: selectedEmployee.team, level: selectedEmployee.skillMatrix || t('not_evaluated') })}
                               </p>
                               <div className="pt-4 flex gap-4">
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('proficiency')}</p>
                                     <p className="text-lg font-black italic">--%</p>
                                  </div>
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('multi_skill_index')}</p>
                                     <p className="text-lg font-black italic">{selectedEmployee.skills.length}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <LayoutGrid className="absolute -bottom-10 -right-10 size-64 text-white/5" />
                      </Card>
                   </div>
                </TabsContent>

                {/* {t('tab_achievements')} */}
                <TabsContent value="achievements" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-3">
                      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white text-center">
                         <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-4">
                            <Zap className="size-6" />
                         </div>
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('award_efficiency')}</h4>
                         <p className="text-2xl font-black text-slate-900 tracking-tighter">--</p>
                      </Card>
                      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white text-center">
                         <div className="size-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mx-auto mb-4">
                            <ShieldCheck className="size-6" />
                         </div>
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('award_quality')}</h4>
                         <p className="text-2xl font-black text-slate-900 tracking-tighter">--</p>
                      </Card>
                      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white text-center">
                         <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mx-auto mb-4">
                            <TrendingUp className="size-6" />
                         </div>
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('points_total')}</h4>
                         <p className="text-2xl font-black text-slate-900 tracking-tighter">0</p>
                      </Card>
                   </div>
                </TabsContent>

                {/* {t('tab_history')} */}
                <TabsContent value="history" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <History className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('no_history')}</p>
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <Users className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* {t('dialog_edit')} / {t('dialog_create')} */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {dialogMode === 'edit' ? t('dialog_edit') : t('dialog_create')}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              {t('dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_id')}</label>
               <Input
                 placeholder="e.g. EMP001"
                 value={employeeNo}
                 maxLength={32}
                 disabled={dialogMode === 'edit'}
                 onChange={(e) => setEmployeeNo(e.target.value.toUpperCase())}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_name')}</label>
               <Input
                 placeholder={t('field_name')}
                 list="employee-name-options"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_team')}</label>
               <Input
                 placeholder="e.g. Assembly Line A"
                 list="employee-team-options"
                 value={team}
                 onChange={(e) => setTeam(e.target.value)}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_matrix')}</label>
               <Input
                 placeholder="e.g. L1 (Junior)"
                 list="employee-skill-options"
                 value={skillMatrix}
                 onChange={(e) => setSkillMatrix(e.target.value)}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_skills')}</label>
               <Input
                 placeholder="e.g. Solder, Assemble, Pack"
                 value={skills}
                 onChange={(e) => setSkills(e.target.value)}
                 className="h-12 bg-slate-50 border-none font-bold"
               />
            </div>
            
            {dialogError ? <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-2">{dialogError}</p> : null}
            <div className="flex gap-3 mt-8">
               <Button variant="outline" className="flex-1 h-12 font-black rounded-xl" onClick={() => setDialogOpen(false)}>{t('Common.cancel')}</Button>
               <Button
                 className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100"
                 disabled={isSubmitting}
                 onClick={() => void submitEmployee()}
               >
                 {isSubmitting ? t('Common.submitting') : t('btn_save')}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


