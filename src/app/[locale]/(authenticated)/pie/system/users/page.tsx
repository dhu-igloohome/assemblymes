'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, UserPlus, Trash2, Key } from 'lucide-react';

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
        setUsers(await uRes.json());
        setEmployees(await eRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('system_users')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('user_management_desc')}</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <UserPlus className="size-4 mr-2" />
          {t('add_user')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('bound_employee')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('created_at')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === 'SUPER_ADMIN' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.employee ? `${user.employee.employeeNo} - ${user.employee.name}` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={user.isActive} 
                        onChange={() => toggleUserStatus(user)} 
                      />
                      <span className="text-xs text-slate-500">
                        {user.isActive ? t('status_enabled') : t('status_disabled')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs" onClick={() => handleDeleteUser(user.id)}>
                      <Trash2 className="size-4 text-slate-400 hover:text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('username')}</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. david" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('password')}</label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                <Input 
                  type="password" 
                  className="pl-9" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('role')}</label>
              <Select value={role} onValueChange={(v) => setRole(v || 'OPERATOR')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                  <SelectItem value="PLANNER">PLANNER</SelectItem>
                  <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                  <SelectItem value="QUALITY">QUALITY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('bind_employee')}</label>
              <Select value={employeeId} onValueChange={(v) => setEmployeeId(v || '')}>
                <SelectTrigger><SelectValue placeholder={t('select_employee')} /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.employeeNo} - {emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting || !username || !password || !employeeId}>
              {isSubmitting ? t('submitting') : t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
