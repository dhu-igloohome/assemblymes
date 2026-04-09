'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button type="button" onClick={openCreate}>
          {t('add')}
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'edit' ? t('dialog_edit') : t('dialog_create')}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              placeholder={t('employee_no')}
              value={employeeNo}
              maxLength={32}
              disabled={dialogMode === 'edit'}
              onChange={(e) => setEmployeeNo(e.target.value.toUpperCase())}
            />
            <datalist id="employee-name-options">
              {employeeNameOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <Input
              placeholder={t('name')}
              list="employee-name-options"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <datalist id="employee-team-options">
              {teamOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <Input
              placeholder={t('team')}
              list="employee-team-options"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
            <datalist id="employee-skill-options">
              {skillOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <Input
              placeholder={t('skill_matrix')}
              list="employee-skill-options"
              value={skillMatrix}
              onChange={(e) => setSkillMatrix(e.target.value)}
            />
            <Input
              placeholder={t('skills_placeholder')}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => void submitEmployee()}
            >
              {isSubmitting ? t('submitting') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {listMessage ? <p className="text-sm text-green-600">{listMessage}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employee_no')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('team')}</TableHead>
                <TableHead>{t('skills')}</TableHead>
                <TableHead>{t('skill_matrix')}</TableHead>
                <TableHead className="w-44">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.employeeNo}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.team}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{row.skillMatrix || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
                        {t('edit')}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => void handleDelete(row)}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}


