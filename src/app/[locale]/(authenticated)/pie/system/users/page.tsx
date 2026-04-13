'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error(err);
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">账号管理中心</h1>
          <p className="text-slate-500 font-medium">System Access & Identity Control</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadData()}>
            刷新
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <UserPlus className="size-4 mr-2" /> 新增账号
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左侧：账号列表 */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="size-5 text-indigo-400" />
                所有系统账号
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder="搜索用户名或员工姓名..."
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
                    <h4 className="font-bold text-slate-800 mb-1">{user.employee?.name || '未绑定员工'}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center gap-2">
                         <div className={`size-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.isActive ? 'Active' : 'Disabled'}</span>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">No matching accounts</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：账号详情/控制台 */}
        <div className="lg:col-span-8 space-y-8">
          {selectedUser ? (
            <>
              {/* 核心身份卡片 */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 col-span-2">
                   <div className="size-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black">
                      <Fingerprint className="size-8 text-indigo-400" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedUser.username}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedUser.role} | {selectedUser.employee?.name || '未关联身份'}</p>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">访问状态</label>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${selectedUser.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <p className="text-sm font-bold text-slate-900">{selectedUser.isActive ? '允许访问' : '禁止访问'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest" onClick={() => void toggleUserStatus(selectedUser)}>
                    {selectedUser.isActive ? '禁用账号' : '启用账号'}
                  </Button>
                  <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest border-red-100 text-red-500 hover:bg-red-50" onClick={() => void handleDeleteUser(selectedUser.id)}>
                    彻底删除
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="account" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Lock className="size-4 mr-2" /> 权限与安全
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> 登录日志
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Settings2 className="size-4 mr-2" /> 偏好设置
                  </TabsTrigger>
                </TabsList>

                {/* 权限与安全 Tab */}
                <TabsContent value="account" className="space-y-6">
                   <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <ShieldCheck className="size-4 text-indigo-600" />
                            权限范围预览
                         </h3>
                         <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                               <UserCheck className="size-4 text-emerald-500" />
                               <span className="text-xs font-bold text-slate-700">可访问制造执行模块</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                               <UserCheck className="size-4 text-emerald-500" />
                               <span className="text-xs font-bold text-slate-700">可查看库存余额</span>
                            </div>
                            {selectedUser.role === 'SUPER_ADMIN' && (
                               <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                  <ShieldAlert className="size-4 text-red-500" />
                                  <span className="text-xs font-bold text-red-700">具备所有系统管理权限</span>
                               </div>
                            )}
                         </div>
                      </Card>

                      <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">身份认证令牌</h3>
                            <div className="space-y-4">
                               <p className="text-xs text-slate-400 leading-relaxed">
                                  该账号已绑定员工 <span className="text-white font-bold">{selectedUser.employee?.name || 'N/A'}</span>。
                                  所有生产报工与库存调整记录将自动关联至此身份。请确保密码安全。
                               </p>
                               <div className="pt-4 flex gap-4">
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">最后密码变更</p>
                                     <p className="text-lg font-black italic">--</p>
                                  </div>
                                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 text-center">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">风险等级</p>
                                     <p className="text-lg font-black italic text-emerald-400">LOW</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <LayoutGrid className="absolute -bottom-10 -right-10 size-64 text-white/5" />
                      </Card>
                   </div>
                </TabsContent>

                {/* 日志 Tab */}
                <TabsContent value="history" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <History className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">暂无登录活动记录</p>
                   </Card>
                </TabsContent>

                {/* 设置 Tab */}
                <TabsContent value="settings" className="space-y-6">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white min-h-[300px] flex flex-col items-center justify-center">
                      <Settings2 className="size-12 text-slate-50 mb-4" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">个人化设置开发中</p>
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <Fingerprint className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">请从左侧选择一个账号查看详情</h3>
               <p className="text-slate-400 text-sm mt-2">在这里管理系统访问权限、绑定员工身份以及维护账号安全</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">新增系统账号</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              创建新的系统访问凭据，并将其绑定至特定员工身份
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">用户名</label>
               <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="如：david" className="h-12 bg-slate-50 border-none font-bold" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">初始密码</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">系统角色</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">绑定员工</label>
                  <Select value={employeeId} onValueChange={(v) => setEmployeeId(v || '')}>
                    <SelectTrigger className="h-12 bg-slate-50 border-none font-bold rounded-xl">
                       <SelectValue placeholder="选择员工" />
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
               <Button variant="outline" className="flex-1 h-12 font-black rounded-xl" onClick={() => setDialogOpen(false)}>取消</Button>
               <Button 
                 className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100"
                 onClick={handleCreateUser} 
                 disabled={isSubmitting || !username || !password || !employeeId}
               >
                 {isSubmitting ? '提交中...' : '确认创建'}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
