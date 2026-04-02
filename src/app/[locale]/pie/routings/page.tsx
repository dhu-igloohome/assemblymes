'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Item {
  itemCode: string;
  itemName: string;
}

interface OperationLine {
  sequence: number;
  operationName: string;
  workstation: string;
  standardTimeSec: number;
}

interface ExistingRoutingRecord {
  id: string;
  itemCode: string;
  version: string;
  updatedAt: string;
  item: {
    itemName: string;
  };
  _count: {
    operations: number;
  };
}

export default function RoutingsPage() {
  const t = useTranslations('Routings');
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [version, setVersion] = useState('V1.0');
  const [operations, setOperations] = useState<OperationLine[]>([]);
  const [existingRoutings, setExistingRoutings] = useState<ExistingRoutingRecord[]>([]);
  const [isLoadingExistingList, setIsLoadingExistingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const loadExistingRoutings = useCallback(async () => {
    setIsLoadingExistingList(true);
    try {
      const res = await fetch('/api/routings?mode=list', { cache: 'no-store' });
      if (!res.ok) {
        setExistingRoutings([]);
        return;
      }
      const data = (await res.json()) as ExistingRoutingRecord[];
      setExistingRoutings(data);
    } catch (error) {
      console.error(error);
      setExistingRoutings([]);
    } finally {
      setIsLoadingExistingList(false);
    }
  }, []);

  const loadRouting = useCallback(async (code: string | null) => {
    if (!code) return;
    setItemCode(code);
    try {
      const res = await fetch(`/api/routings?itemCode=${code}`);
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        setOperations(
          data.operations.map(
            (o: {
              sequence: number;
              operationName: string;
              workstation: string;
              standardTimeSec: number;
            }) => ({
              sequence: o.sequence,
              operationName: o.operationName,
              workstation: o.workstation,
              standardTimeSec: o.standardTimeSec,
            })
          )
        );
      } else {
        setOperations([]);
      }
    } catch (error) {
      console.error(error);
      setOperations([]);
    }
  }, []);

  useEffect(() => {
    void loadExistingRoutings();
  }, [loadExistingRoutings]);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data: Item[]) => {
        setItems(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const initialItemCode = searchParams.get('itemCode');
    if (!initialItemCode || items.length === 0) {
      return;
    }
    const exists = items.some((item) => item.itemCode === initialItemCode);
    if (!exists) {
      return;
    }
    void loadRouting(initialItemCode);
  }, [searchParams, items, loadRouting]);

  const handleAddOperation = () => {
    setOperations([
      ...operations, 
      { sequence: (operations.length + 1) * 10, operationName: '', workstation: '', standardTimeSec: 60 }
    ]);
  };

  const updateOperation = (index: number, field: keyof OperationLine, value: string | number) => {
    const newOps = [...operations];
    newOps[index] = { ...newOps[index], [field]: value };
    setOperations(newOps);
  };

  const handleSave = async () => {
    if (!itemCode) {
      return;
    }
    setSubmitMessage('');
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCode, version, operations }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { details?: string; error?: string } | null;
        setSubmitError(payload?.details ?? payload?.error ?? t('save_failed'));
        return;
      }
      setSubmitMessage(t('save_success'));
      await loadExistingRoutings();
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? `${t('save_failed')} ${error.message}` : t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Button onClick={() => void handleSave()} disabled={!itemCode || isSubmitting}>
          {isSubmitting ? t('submitting') : t('save')}
        </Button>
      </div>

      {submitMessage ? <p className="text-sm text-green-600">{submitMessage}</p> : null}
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="space-y-4 rounded-md border p-4">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('existing_routings')}</h2>
        </div>
        {isLoadingExistingList ? (
          <p className="text-sm text-gray-500">{t('loading_records')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('select_item')}</TableHead>
                <TableHead>{t('version')}</TableHead>
                <TableHead>{t('operation_count')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingRoutings.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => void loadRouting(record.itemCode)}
                >
                  <TableCell>{`${record.itemCode} - ${record.item.itemName}`}</TableCell>
                  <TableCell>{record.version}</TableCell>
                  <TableCell>{record._count.operations}</TableCell>
                </TableRow>
              ))}
              {existingRoutings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-gray-500">
                    {t('no_existing_routings')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <Select onValueChange={(v) => loadRouting(v ? String(v) : null)} value={itemCode}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_item')} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.itemCode} value={item.itemCode}>
                  {item.itemCode} - {item.itemName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px] w-40">
          <Input placeholder={t('version')} value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
      </div>

      {itemCode && (
        <div className="space-y-4 rounded-md border p-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('operations_panel')}</h2>
            <Button variant="outline" onClick={handleAddOperation}>{t('add_operation')}</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sequence')}</TableHead>
                <TableHead>{t('operation_name')}</TableHead>
                <TableHead>{t('workstation')}</TableHead>
                <TableHead>{t('standard_time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('sequence')}
                      value={op.sequence}
                      onChange={(e) => updateOperation(idx, 'sequence', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder={t('operation_name')}
                      value={op.operationName}
                      onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder={t('workstation')}
                      value={op.workstation}
                      onChange={(e) => updateOperation(idx, 'workstation', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('standard_time')}
                      value={op.standardTimeSec}
                      onChange={(e) => updateOperation(idx, 'standardTimeSec', Number(e.target.value))}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {operations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    {t('no_routing')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}