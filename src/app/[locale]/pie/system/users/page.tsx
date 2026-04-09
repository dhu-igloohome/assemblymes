'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SystemUser {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    employeeNo: string;
    team: string;
  };
}

interface Employee {
  id: string;
  name: string;
  employeeNo: string;
  team: string;
}

export default function SystemUsersPage() {
  const t = useTranslations('System');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    employeeId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, employeesRes] = await Promise.all([
        fetch('/api/system/users'),
        fetch('/api/pie/employees')
      ]);

      if (!usersRes.ok) throw new Error(t('load_failed'));
      if (!employeesRes.ok) throw new Error('Failed to load employees');

      const [usersData, employeesData] = await Promise.all([
        usersRes.json(),
        employeesRes.json()
      ]);

      setUsers(usersData);
      setEmployees(employeesData);
    } catch (err: any) {
      setError(err.message || t('load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      password: '',
      role: '',
      employeeId: '',
      isActive: true,
    });
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: SystemUser) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      password: '', // Blank by default when editing
      role: user.role,
      employeeId: user.employee.id,
      isActive: user.isActive,
    });
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    // Basic validation
    if (!editingUserId && !formData.username) {
      setSubmitError(t('username_required'));
      setSubmitting(false);
      return;
    }
    if (!editingUserId && !formData.password) {
      setSubmitError(t('password_required'));
      setSubmitting(false);
      return;
    }
    if (!formData.role) {
      setSubmitError(t('role_required'));
      setSubmitting(false);
      return;
    }
    if (!editingUserId && !formData.employeeId) {
      setSubmitError(t('employee_required'));
      setSubmitting(false);
      return;
    }

    try {
      const url = editingUserId 
        ? `/api/system/users/${editingUserId}` 
        : '/api/system/users';
      
      const payload: any = {
        role: formData.role,
        isActive: formData.isActive,
      };

      if (!editingUserId) {
        payload.username = formData.username;
        payload.employeeId = formData.employeeId;
        payload.password = formData.password;
      } else if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method: editingUserId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (editingUserId ? t('update_failed') : t('create_failed')));
      }

      setSubmitSuccess(editingUserId ? t('update_success') : t('create_success'));
      setTimeout(() => {
        setIsDialogOpen(false);
        fetchData();
      }, 1000);
    } catch (err: any) {
      setSubmitError(err.message || (editingUserId ? t('update_failed') : t('create_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    const roleKey = `role_${role.toLowerCase()}`;
    // @ts-ignore
    return t(roleKey) || role;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          {t('create_user')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('loading')}</div>
      ) : users.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 border-dashed p-12 text-center">
          <p className="text-gray-500">{t('empty')}</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('username')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('employee')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('role')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('is_active')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('created_at')}</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('actions')}</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.employee.name} ({user.employee.team})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getRoleDisplay(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      user.isActive ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10'
                    }`}>
                      {user.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditDialog(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {t('edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-medium text-gray-900">
                {editingUserId ? t('edit') : t('create_user')}
              </h2>
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                  {submitSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                <input
                  type="text"
                  required={!editingUserId}
                  disabled={!!editingUserId}
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value.trim()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employee')}</label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  >
                    <option value="">-- {t('select_employee')} --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeNo} - {emp.team})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                <select
                  required
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                >
                  <option value="">-- Select --</option>
                  <option value="SUPER_ADMIN">{t('role_super_admin')}</option>
                  <option value="ENGINEER">{t('role_engineer')}</option>
                  <option value="PLANNER">{t('role_planner')}</option>
                  <option value="INVENTORY">{t('role_inventory')}</option>
                  <option value="PRODUCTION">{t('role_production')}</option>
                  <option value="QUALITY">{t('role_quality')}</option>
                  <option value="FINANCE">{t('role_finance')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password')} 
                  {editingUserId && <span className="text-gray-500 ml-2 font-normal">({t('password_hint')})</span>}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  {t('active')}
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                >
                  {submitting ? t('submitting') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
