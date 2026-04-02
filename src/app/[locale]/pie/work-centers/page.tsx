'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { WorkCenterType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
          setDialogError(payload?.details ?? payload?.error ?? t('save_failed'));
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
        setDialogError(payload?.details ?? payload?.error ?? t('save_failed'));
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
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
                placeholder={t('code')}
                value={code}
                disabled={dialogMode === 'edit'}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={16}
              />
              <Input placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
              <Select
                value={wcType}
                onValueChange={(v) => setWcType((v ?? 'FLOW_LINE') as WorkCenterType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CENTER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {typeLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t('daily_capacity')}
                value={dailyCapacity}
                inputMode="numeric"
                onChange={(e) => setDailyCapacity(e.target.value)}
              />
              {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
              <Button
                type="button"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => void submitWorkCenter()}
              >
                {isSubmitting ? t('submitting') : t('save')}
              </Button>
            </div>
          </DialogContent>
      </Dialog>

      {listMessage ? <p className="text-sm text-green-600">{listMessage}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="rounded-md border">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('code')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('daily_capacity')}</TableHead>
                <TableHead className="w-44">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.workCenterCode}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{typeLabel(row.type)}</TableCell>
                  <TableCell>{row.dailyCapacity ?? '—'}</TableCell>
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
