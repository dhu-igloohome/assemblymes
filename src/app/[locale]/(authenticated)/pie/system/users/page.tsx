'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Key, 
  Users, 
  Search, 
  ChevronRight, 
  Lock, 
  UserCheck, 
  ShieldAlert, 
  Settings2, 
  History, 
  LayoutGrid,
  Fingerprint
} from 'lucide-react';

interface Employee {
  id: string;
  employeeNo: string;
  name: string;
}

interface SystemUserRow {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  employeeId: string;
  employee: Employee;
  createdAt: string;
}

export default function SystemUsersPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  
  // Permission Matrix Definition
  const ROLE_PERMISSIONS: Record<string, { label: string; icon: any; color: string }[]> = {
    SUPER_ADMIN: [
      { label: 'Full System Access', icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
      { label: 'Integration Hub Management', icon: Settings2, color: 'text-indigo-500 bg-indigo-50' },
      { label: 'Audit Log Retrieval', icon: History, color: 'text-slate-500 bg-slate-50' },
    ],
    PLANNER: [
      { label: 'Production Planning', icon: LayoutGrid, color: 'text-indigo-500 bg-indigo-50' },
      { label: 'BOM & Routing Control', icon: Settings2, color: 'text-indigo-500 bg-indigo-50' },
      { label: 'Inventory Overview', icon: LayoutGrid, color: 'text-emerald-500 bg-emerald-50' },
    ],
    OPERATOR: [
      { label: 'Mobile Execution Reporting', icon: Fingerprint, color: 'text-emerald-500 bg-emerald-50' },
      { label: 'Work Order Execution', icon: LayoutGrid, color: 'text-indigo-500 bg-indigo-50' },
      { label: 'Andon Issue Reporting', icon: ShieldAlert, color: 'text-amber-500 bg-amber-50' },
    ],
    QUALITY: [
      { label: 'Quality Inspection', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-50' },
      { label: 'Defect Analysis Board', icon: LayoutGrid, color: 'text-indigo-500 bg-indigo-50' },
    ]
  };

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [employeeId, setEmployeeId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [uRes, eRes] = await Promise.all([
        fetch('/api/system/users', { cache: 'no-store' }),
        fetch('/api/employees', { cache: 'no-store' }),
      ]);
      if (uRes.ok && eRes.ok) {
        const userData = await uRes.json();
        setUsers(userData);
        setEmployees(await eRes.json());
        if (userData.length > 0 && !selectedUserId) {
          setSelectedUserId(userData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole('OPERATOR');
    setEmployeeId('');
    setIsActive(true);
    setError('');
  };

  const handleCreateUser = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/system/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, employeeId, isActive }),
      });
      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        await loadData();
      } else {
        const data = await res.json();
        setError(t(data.error?.toLowerCase()) || t('save_failed'));
      }
    } catch {
      setError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: SystemUserRow) => {
    try {
      const res = await fetch(`/api/system/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(t('users_status_updated'));
        await loadData();
      }
    } catch (err) {
      toast.error(t('save_failed'));
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/system/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(t('users_role_updated'));
        await loadData();
      }
    } catch (err) {
      toast.error(t('save_failed'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      const res = await fetch(`/api/system/users/${id}`, { method: 'DELETE' });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('users_center')}</h1>
          <p className="text-slate-500 font-medium">{t('users_center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadData()}>
            {tc('refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <UserPlus className="size-4 mr-2" /> {t('add_user')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_account_list')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="size-5 text-indigo-400" />
                {t('users_list_title')}
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder={t('users_search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 italic">{tc('loading')}</div>
                ) : filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedUserId === user.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {user.username}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                        user.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{user.employee?.name || t('users_unbound')}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center gap-2">
                         <div className={`size-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.isActive ? t('users_active') : t('users_disabled')}</span>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{tc('empty')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_console')} */}
        <div className="lg:col-span-8 space-y-8">
          {selectedUser ? (
            <>
              {/* {t('users_identity_card')} */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 col-span-2">
                   <div className="size-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black">
                      <Fingerprint className="size-8 text-indigo-400" />
                   </div>
                   <div className="space-y-1">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedUser.username}</h2>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={selectedUser.role} 
                          onValueChange={(v) => void handleUpdateRole(selectedUser.id, v)}
                        >
                          <SelectTrigger className="h-7 min-w-[120px] bg-slate-100 border-none font-black text-[10px] uppercase tracking-widest rounded-lg px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                            <SelectItem value="PLANNER">PLANNER</SelectItem>
                            <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                            <SelectItem value="QUALITY">QUALITY</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l pl-2">
                          {selectedUser.employee?.name || t('users_unlinked')}
                        </span>
                      </div>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users_access_status')}</label>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${selectedUser.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <p className="text-sm font-bold text-slate-900">{selectedUser.isActive ? t('users_allow_access') : t('users_deny_access')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest" onClick={() => void toggleUserStatus(selectedUser)}>
                    {selectedUser.isActive ? t('users_btn_disable') : t('users_btn_enable')}
                  </Button>
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest border-red-100 text-red-500 hover:bg-red-50" onClick={() => void handleDeleteUser(selectedUser.id)}>
                    {t('users_btn_delete')}
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="account" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Lock className="size-4 mr-2" /> {t('users_tab_security')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> {t('users_tab_logs')}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Settings2 className="size-4 mr-2" /> {t('users_tab_prefs')}
                  </TabsTrigger>
                </TabsList>

                {/* {t('users_tab_security')} */}
                <TabsContent value="account" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <ShieldCheck className="size-4 text-indigo-600" />
                            {t('users_permission_preview')}
                         </h3>
                         <div className="space-y-3">
                            {(ROLE_PERMISSIONS[selectedUser.role] || []).map((perm, idx) => (
                               <div key={idx} className={`flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02] border border-transparent hover:border-slate-100 ${perm.color}`}>
                                  <perm.icon className="size-4 shrink-0" />
                                  <span className="text-xs font-black uppercase tracking-tight">{perm.label}</span>
                               </div>
                            ))}
                         </div>
                      </Card>

                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">{t('users_identity_token')}</h3>
                            <div className="space-y-4">
                               <p className="text-xs text-slate-400 leading-relaxed">
                                  {t('users_identity_token_desc', { name: selectedUser.employee?.name || 'N/A' })}
                               </p>
                               <div className="pt-4 flex gap-4">
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('users_last_pwd_change')}</p>
                                     <p className="text-lg font-black italic">--</p>
                                  </div>
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('users_risk_level')}</p>
                                     <p className="text-lg font-black italic text-emerald-400">LOW</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <LayoutGrid className="absolute -bottom-10 -right-10 size-64 text-white/5" />
                      </Card>
                   </div>
                </TabsContent>

                {/* {t('users_tab_logs')} */}
                <TabsContent value="history" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <History className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('users_no_logs')}</p>
                   </Card>
                </TabsContent>

                {/* {t('users_tab_prefs')} */}
                <TabsContent value="settings" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <Settings2 className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('users_pref_dev')}</p>
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <Fingerprint className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('users_select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('users_select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* {t('dialog_container')} */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('add_user')}</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              {t('users_dialog_create_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users_field_username')}</label>
               <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. david" className="h-12 bg-slate-50 border-none font-bold" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users_field_password')}</label>
               <div className="relative">
                 <Key className="absolute left-4 top-4 size-4 text-slate-400" />
                 <Input 
                   type="password" 
                   className="h-12 bg-slate-50 border-none font-bold pl-12" 
                   value={password} 
                   onChange={e => setPassword(e.target.value)} 
                 />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users_field_role')}</label>
                  <Select value={role} onValueChange={(v) => setRole(v || 'OPERATOR')}>
                    <SelectTrigger className="h-12 bg-slate-50 border-none font-bold rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                      <SelectItem value="PLANNER">PLANNER</SelectItem>
                      <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                      <SelectItem value="QUALITY">QUALITY</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users_field_employee')}</label>
                  <Select value={employeeId} onValueChange={(v) => setEmployeeId(v || '')}>
                    <SelectTrigger className="h-12 bg-slate-50 border-none font-bold rounded-xl">
                       <SelectValue placeholder={t('select_employee')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
            </div>
            
            {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-2">{error}</p>}
            <div className="flex gap-3 mt-8">
               <Button variant="outline" className="flex-1 h-12 font-black rounded-xl" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
               <Button 
                 className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100"
                 onClick={handleCreateUser} 
                 disabled={isSubmitting || !username || !password || !employeeId}
               >
                 {isSubmitting ? tc('submitting') : t('confirm')}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
