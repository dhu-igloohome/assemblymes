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
  isInspectionPoint: boolean;
  inspectionStandard: string;
  sopUrl: string;
}

interface ExistingRoutingRecord {
  id: string;
  itemCode: string;
  version: string;
  effectiveDate: string | null;
  changeNote: string | null;
  createdBy: string | null;
  updatedAt: string;
  item: {
    itemName: string;
  };
  _count: {
    operations: number;
  };
}

interface RoutingSuggestions {
  operationNames: string[];
}

interface WorkCenter {
  id: string;
  workCenterCode: string;
  name: string;
}

export default function RoutingsPage() {
  const t = useTranslations('Routings');
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [version, setVersion] = useState('V1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [operations, setOperations] = useState<OperationLine[]>([]);
  const [existingRoutings, setExistingRoutings] = useState<ExistingRoutingRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RoutingSuggestions>({
    operationNames: [],
  });
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
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

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/routings?mode=suggestions', { cache: 'no-store' });
      if (!res.ok) {
        setSuggestions({ operationNames: [] });
        return;
      }
      const data = (await res.json()) as RoutingSuggestions;
      setSuggestions({
        operationNames: Array.from(new Set(data.operationNames.map((v) => v.trim()).filter(Boolean))),
      });
    } catch {
      setSuggestions({ operationNames: [] });
    }
  }, []);

  const loadWorkCenters = useCallback(async () => {
    try {
      const res = await fetch('/api/work-centers', { cache: 'no-store' });
      if (!res.ok) {
        setWorkCenters([]);
        return;
      }
      const data = (await res.json()) as WorkCenter[];
      setWorkCenters(data);
    } catch {
      setWorkCenters([]);
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
        setEffectiveDate(data.effectiveDate ? String(data.effectiveDate).slice(0, 10) : '');
        setChangeNote(data.changeNote ?? '');
        setCreatedBy(data.createdBy ?? '');
        setOperations(
          data.operations.map(
            (o: {
              sequence: number;
              operationName: string;
              workstation: string;
              standardTimeSec: number;
              isInspectionPoint?: boolean;
              inspectionStandard?: string | null;
              sopUrl?: string | null;
            }) => ({
              sequence: o.sequence,
              operationName: o.operationName,
              workstation: o.workstation,
              standardTimeSec: o.standardTimeSec,
              isInspectionPoint: o.isInspectionPoint ?? false,
              inspectionStandard: o.inspectionStandard ?? '',
              sopUrl: o.sopUrl ?? '',
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
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    void loadWorkCenters();
  }, [loadWorkCenters]);

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
      {
        sequence: (operations.length + 1) * 10,
        operationName: '',
        workstation: '',
        standardTimeSec: 60,
        isInspectionPoint: false,
        inspectionStandard: '',
        sopUrl: '',
      },
    ]);
  };

  const updateOperation = (
    index: number,
    field: keyof OperationLine,
    value: string | number | boolean
  ) => {
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
        body: JSON.stringify({
          itemCode,
          version,
          effectiveDate,
          changeNote,
          createdBy,
          operations,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { details?: string; error?: string } | null;
        const code = payload?.error;
        const codeToMessage: Record<string, string> = {
          ITEM_CODE_INVALID: t('save_failed'),
          VERSION_REQUIRED: t('save_failed'),
          OPERATIONS_INVALID: t('save_failed'),
          ROUTING_SAVE_FAILED: t('save_failed'),
          WORKSTATION_NOT_FOUND: t('workstation_not_found'),
        };
        setSubmitError(payload?.details ?? (code && codeToMessage[code]) ?? t('save_failed'));
        return;
      }
      setSubmitMessage(t('save_success'));
      await loadExistingRoutings();
      await loadSuggestions();
      await loadWorkCenters();
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
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button onClick={() => void handleSave()} disabled={!itemCode || isSubmitting}>
          {isSubmitting ? t('submitting') : t('save')}
        </Button>
      </div>

      {submitMessage ? <p className="text-sm text-green-600">{submitMessage}</p> : null}
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
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
                <TableHead>{t('effective_date')}</TableHead>
                <TableHead>{t('created_by')}</TableHead>
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
                  <TableCell>{record.effectiveDate ? String(record.effectiveDate).slice(0, 10) : '-'}</TableCell>
                  <TableCell>{record.createdBy || '-'}</TableCell>
                  <TableCell>{record._count.operations}</TableCell>
                </TableRow>
              ))}
              {existingRoutings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-gray-500">
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
          <datalist id="routing-version-options">
            {Array.from(
              new Set(
                existingRoutings
                  .filter((r) => r.itemCode === itemCode)
                  .map((r) => r.version)
                  .filter(Boolean)
              )
            )
              .sort()
              .map((v) => (
                <option key={v} value={v} />
              ))}
          </datalist>
          <Input
            placeholder={t('version')}
            list="routing-version-options"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
        <div className="min-w-[160px] w-44">
          <Input
            type="date"
            placeholder={t('effective_date')}
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder={t('created_by')}
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          />
        </div>
        <div className="min-w-[260px] flex-1">
          <Input
            placeholder={t('change_note')}
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
          />
        </div>
      </div>

      {itemCode && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('operations_panel')}</h2>
            <Button variant="outline" onClick={handleAddOperation}>{t('add_operation')}</Button>
          </div>
          <div className="overflow-x-auto">
            <datalist id="routing-operation-name-options">
              {suggestions.operationNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sequence')}</TableHead>
                  <TableHead>{t('operation_name')}</TableHead>
                  <TableHead>{t('workstation')}</TableHead>
                  <TableHead>{t('standard_time')}</TableHead>
                  <TableHead>{t('inspection_point')}</TableHead>
                  <TableHead>{t('inspection_standard')}</TableHead>
                  <TableHead>{t('sop_url')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="min-w-[88px]">
                      <Input
                        type="number"
                        placeholder={t('sequence')}
                        value={op.sequence}
                        onChange={(e) => updateOperation(idx, 'sequence', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Input
                        placeholder={t('operation_name')}
                        value={op.operationName}
                        list="routing-operation-name-options"
                        onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Select
                        value={op.workstation || null}
                        onValueChange={(value) =>
                          updateOperation(idx, 'workstation', value ? String(value) : '')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('workstation')} />
                        </SelectTrigger>
                        <SelectContent>
                          {workCenters.map((wc) => (
                            <SelectItem key={wc.id} value={wc.workCenterCode}>
                              {wc.workCenterCode} - {wc.name}
                            </SelectItem>
                          ))}
                          {op.workstation &&
                          !workCenters.some((wc) => wc.workCenterCode === op.workstation) ? (
                            <SelectItem value={op.workstation}>
                              {`${op.workstation} (legacy)`}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Input
                        type="number"
                        placeholder={t('standard_time')}
                        value={op.standardTimeSec}
                        onChange={(e) => updateOperation(idx, 'standardTimeSec', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <Select
                        value={op.isInspectionPoint ? 'true' : 'false'}
                        onValueChange={(value) =>
                          updateOperation(idx, 'isInspectionPoint', value === 'true')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('inspection_point')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">{t('no')}</SelectItem>
                          <SelectItem value="true">{t('yes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Input
                        placeholder={t('inspection_standard')}
                        value={op.inspectionStandard}
                        disabled={!op.isInspectionPoint}
                        onChange={(e) => updateOperation(idx, 'inspectionStandard', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Input
                        placeholder={t('sop_url')}
                        value={op.sopUrl}
                        onChange={(e) => updateOperation(idx, 'sopUrl', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {operations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                      {t('no_routing')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
