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

interface BomLine {
  componentItemCode: string | null;
  quantity: number;
  scrapRate: number;
}

interface BomVersion {
  id: string;
  version: string;
  isActive: boolean;
  effectiveDate: string | null;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExistingBomRecord {
  id: string;
  parentItemCode: string;
  version: string;
  isActive: boolean;
  effectiveDate: string | null;
  changeNote: string | null;
  createdBy: string | null;
  updatedAt: string;
  parentItem: {
    itemName: string;
  };
  _count: {
    lines: number;
  };
}

interface BomTreeNode {
  id: string;
  componentItemCode: string;
  componentItemName: string;
  quantity: number;
  scrapRate: number;
  children: BomTreeNode[];
}

interface BomDiffLine {
  componentItemCode: string;
  componentItemName: string;
  changeType: 'added' | 'removed' | 'changed';
  fromQuantity: number | null;
  toQuantity: number | null;
  fromScrapRate: number | null;
  toScrapRate: number | null;
}

function BomTree({
  nodes,
  level = 0,
}: {
  nodes: BomTreeNode[];
  level?: number;
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="space-y-2">
          <div
            className="rounded-xl border border-slate-200 bg-white shadow-sm bg-white p-3 text-sm text-gray-700"
            style={{ marginLeft: `${level * 20}px` }}
          >
            <div className="font-medium">{`${node.componentItemCode} - ${node.componentItemName}`}</div>
            <div className="text-xs text-gray-500">{`Qty: ${node.quantity} | Scrap: ${node.scrapRate}`}</div>
          </div>
          <BomTree nodes={node.children} level={level + 1} />
        </div>
      ))}
    </div>
  );
}

export default function BomsPage() {
  const t = useTranslations('Boms');
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [parentItemCode, setParentItemCode] = useState<string | null>(null);
  const [version, setVersion] = useState('V1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [lines, setLines] = useState<BomLine[]>([]);
  const [existingBoms, setExistingBoms] = useState<ExistingBomRecord[]>([]);
  const [versions, setVersions] = useState<BomVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [tree, setTree] = useState<BomTreeNode[]>([]);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<BomDiffLine[]>([]);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isLoadingExistingList, setIsLoadingExistingList] = useState(true);

  const loadVersions = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/boms?parentItemCode=${code}&mode=versions`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        setVersions([]);
        return;
      }

      const data = (await res.json()) as BomVersion[];
      setVersions(data);
      const activeVersion = data.find((entry) => entry.isActive);
      const resolvedVersion = activeVersion?.version ?? data[0]?.version ?? null;
      setSelectedVersion(resolvedVersion);
      setCompareVersion((current) => current ?? data.find((entry) => entry.version !== resolvedVersion)?.version ?? null);
      return resolvedVersion;
    } catch (error) {
      console.error(error);
      setVersions([]);
      return null;
    }
  }, []);

  const loadExistingBoms = useCallback(async () => {
    setIsLoadingExistingList(true);
    try {
      const res = await fetch('/api/boms?mode=list', { cache: 'no-store' });
      if (!res.ok) {
        setExistingBoms([]);
        return;
      }
      const data = (await res.json()) as ExistingBomRecord[];
      setExistingBoms(data);
    } catch (error) {
      console.error(error);
      setExistingBoms([]);
    } finally {
      setIsLoadingExistingList(false);
    }
  }, []);

  const loadTree = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/boms?parentItemCode=${code}&mode=tree`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        setTree([]);
        return;
      }

      const data = await res.json();
      setTree(data.children ?? []);
    } catch (error) {
      console.error(error);
      setTree([]);
    }
  }, []);

  const loadBom = useCallback(async (code: string | null) => {
    if (!code) return;
    setParentItemCode(code);
    try {
      const resolvedVersion = await loadVersions(code);
      await loadTree(code);

      const res = await fetch(
        `/api/boms?parentItemCode=${code}${resolvedVersion ? `&version=${resolvedVersion}` : ''}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        setEffectiveDate(data.effectiveDate ? String(data.effectiveDate).slice(0, 10) : '');
        setChangeNote(data.changeNote ?? '');
        setCreatedBy(data.createdBy ?? '');
        setSelectedVersion(data.version);
        setLines(data.lines.map((l: { componentItemCode: string, quantity: string | number, scrapRate: string | number }) => ({
          componentItemCode: l.componentItemCode,
          quantity: Number(l.quantity),
          scrapRate: Number(l.scrapRate)
        })));
      } else {
        setLines([]);
      }
    } catch (error) {
      console.error(error);
      setLines([]);
    }
  }, [loadTree, loadVersions]);

  useEffect(() => {
    void loadExistingBoms();
  }, [loadExistingBoms]);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data: Item[]) => {
        setItems(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const initialParentItemCode = searchParams.get('parentItemCode');
    if (!initialParentItemCode || items.length === 0) {
      return;
    }
    const exists = items.some((item) => item.itemCode === initialParentItemCode);
    if (!exists) {
      return;
    }
    void loadBom(initialParentItemCode);
  }, [searchParams, items, loadBom]);

  useEffect(() => {
    if (!parentItemCode || !selectedVersion) {
      return;
    }

    fetch(`/api/boms?parentItemCode=${parentItemCode}&version=${selectedVersion}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          return;
        }
        setVersion(data.version);
        setEffectiveDate(data.effectiveDate ? String(data.effectiveDate).slice(0, 10) : '');
        setChangeNote(data.changeNote ?? '');
        setCreatedBy(data.createdBy ?? '');
        setLines(
          data.lines.map((line: { componentItemCode: string; quantity: string | number; scrapRate: string | number }) => ({
            componentItemCode: line.componentItemCode,
            quantity: Number(line.quantity),
            scrapRate: Number(line.scrapRate),
          }))
        );
      })
      .catch(console.error);
  }, [parentItemCode, selectedVersion]);

  useEffect(() => {
    if (!parentItemCode || !selectedVersion || !compareVersion || selectedVersion === compareVersion) {
      return;
    }

    fetch(
      `/api/boms?parentItemCode=${parentItemCode}&mode=diff&version=${selectedVersion}&compareVersion=${compareVersion}`,
      { cache: 'no-store' }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setDiffLines(data?.diff ?? []);
      })
      .catch((error) => {
        console.error(error);
        setDiffLines([]);
      });
  }, [compareVersion, parentItemCode, selectedVersion]);

  const handleAddLine = () => {
    setLines([...lines, { componentItemCode: null, quantity: 1, scrapRate: 0 }]);
  };

  const moveLine = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lines.length) {
      return;
    }

    const newLines = [...lines];
    const [currentLine] = newLines.splice(index, 1);
    newLines.splice(targetIndex, 0, currentLine);
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateLine = (index: number, field: keyof BomLine, value: string | number | null) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSave = async () => {
    try {
      setSubmitError('');
      setSubmitMessage('');
      const res = await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentItemCode,
          version,
          effectiveDate,
          changeNote,
          createdBy,
          lines,
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setSubmitError(payload?.details ?? payload?.error ?? t('save_failed'));
        return;
      }
      setSubmitMessage(t('save_success'));
      if (parentItemCode) {
        await loadVersions(parentItemCode);
        await loadTree(parentItemCode);
      }
      await loadExistingBoms();
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? `${t('save_failed')}: ${error.message}` : t('save_failed'));
    }
  };

  const handleActivateVersion = async (nextVersion: string | null) => {
    if (!parentItemCode || !nextVersion) {
      return;
    }

    try {
      setSubmitError('');
      setSubmitMessage('');
      const res = await fetch('/api/boms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentItemCode,
          version: nextVersion,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setSubmitError(payload?.details ?? payload?.error ?? t('activate_failed'));
        return;
      }

      setSelectedVersion(nextVersion);
      setSubmitMessage(t('activate_success'));
      await loadVersions(parentItemCode);
      await loadTree(parentItemCode);
      await loadExistingBoms();
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error ? `${t('activate_failed')}: ${error.message}` : t('activate_failed')
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button onClick={handleSave} disabled={!parentItemCode}>{t('save')}</Button>
      </div>

      {submitMessage ? (
        <p className="text-sm text-green-600">{submitMessage}</p>
      ) : null}
      {submitError ? (
        <p className="text-sm text-red-600">{submitError}</p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{t('existing_boms')}</h2>
        </div>
        {isLoadingExistingList ? (
          <p className="text-sm text-gray-500">{t('loading_records')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('select_parent')}</TableHead>
                <TableHead>{t('version')}</TableHead>
                <TableHead>{t('effective_date')}</TableHead>
                <TableHead>{t('created_by')}</TableHead>
                <TableHead>{t('current_version')}</TableHead>
                <TableHead>{t('line_count')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingBoms.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => void loadBom(record.parentItemCode)}
                >
                  <TableCell>{`${record.parentItemCode} - ${record.parentItem.itemName}`}</TableCell>
                  <TableCell>{record.version}</TableCell>
                  <TableCell>{record.effectiveDate ? String(record.effectiveDate).slice(0, 10) : '-'}</TableCell>
                  <TableCell>{record.createdBy || '-'}</TableCell>
                  <TableCell>{record.isActive ? t('yes') : t('no')}</TableCell>
                  <TableCell>{record._count.lines}</TableCell>
                </TableRow>
              ))}
              {existingBoms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                    {t('no_existing_boms')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-2">
        <div className="min-w-[200px] flex-1">
          <Select onValueChange={(v) => loadBom(v ? String(v) : null)} value={parentItemCode}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_parent')} />
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
          <datalist id="bom-version-options">
            {Array.from(
              new Set(
                [
                  ...versions.map((v) => v.version),
                  ...existingBoms
                    .filter((b) => b.parentItemCode === parentItemCode)
                    .map((b) => b.version),
                ].filter(Boolean)
              )
            )
              .sort()
              .map((v) => (
                <option key={v} value={v} />
              ))}
          </datalist>
          <Input
            placeholder={t('version')}
            list="bom-version-options"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Select
            value={selectedVersion}
            onValueChange={(value) => {
              const nextVersion = value ? String(value) : null;
              setDiffLines([]);
              setSelectedVersion(nextVersion);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('select_version')} />
            </SelectTrigger>
            <SelectContent>
              {versions.map((entry) => (
                <SelectItem key={entry.id} value={entry.version}>
                  {entry.isActive ? `${entry.version} (${t('current_version')})` : entry.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {parentItemCode && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">{t('version_panel')}</h2>
              <Button
                variant="outline"
                onClick={() => handleActivateVersion(selectedVersion)}
                disabled={!selectedVersion}
              >
                {t('set_current_version')}
              </Button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {versions.length === 0 ? (
                <p>{t('no_versions')}</p>
              ) : (
                versions.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded border p-2">
                    <span>{entry.version}</span>
                    <span className={entry.isActive ? 'text-green-600' : 'text-gray-500'}>
                      {entry.isActive ? t('current_version') : t('historical_version')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-700">{t('diff_panel')}</h2>
              <div className="w-full sm:w-64">
                <Select
                  value={compareVersion}
                  onValueChange={(value) => {
                    setDiffLines([]);
                    setCompareVersion(value ? String(value) : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_compare_version')} />
                  </SelectTrigger>
                  <SelectContent>
                    {versions
                      .filter((entry) => entry.version !== selectedVersion)
                      .map((entry) => (
                        <SelectItem key={entry.id} value={entry.version}>
                          {entry.version}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {diffLines.length === 0 ? (
              <p className="text-sm text-gray-500">{t('no_diff')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('component_code')}</TableHead>
                    <TableHead>{t('change_type')}</TableHead>
                    <TableHead>{t('from_quantity')}</TableHead>
                    <TableHead>{t('to_quantity')}</TableHead>
                    <TableHead>{t('from_scrap_rate')}</TableHead>
                    <TableHead>{t('to_scrap_rate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffLines.map((line) => (
                    <TableRow key={`${line.componentItemCode}-${line.changeType}`}>
                      <TableCell>{`${line.componentItemCode} - ${line.componentItemName}`}</TableCell>
                      <TableCell>
                        <span
                          className={
                            line.changeType === 'added'
                              ? 'text-green-600'
                              : line.changeType === 'removed'
                                ? 'text-red-600'
                                : 'text-amber-600'
                          }
                        >
                          {t(`change_${line.changeType}` as Parameters<typeof t>[0])}
                        </span>
                      </TableCell>
                      <TableCell>{line.fromQuantity ?? '-'}</TableCell>
                      <TableCell>{line.toQuantity ?? '-'}</TableCell>
                      <TableCell>{line.fromScrapRate ?? '-'}</TableCell>
                      <TableCell>{line.toScrapRate ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">{t('line_panel')}</h2>
              <Button variant="outline" onClick={handleAddLine}>{t('add_component')}</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('line_order')}</TableHead>
                  <TableHead>{t('component_code')}</TableHead>
                  <TableHead>{t('quantity')}</TableHead>
                  <TableHead>{t('scrap_rate')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="w-28">
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => moveLine(idx, 'up')}
                          disabled={idx === 0}
                        >
                          {t('move_up')}
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => moveLine(idx, 'down')}
                          disabled={idx === lines.length - 1}
                        >
                          {t('move_down')}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <datalist id="bom-component-options">
                        {items
                          .filter((item) => item.itemCode !== parentItemCode)
                          .map((item) => (
                            <option
                              key={item.itemCode}
                              value={`${item.itemCode} ${item.itemName}`}
                            />
                          ))}
                      </datalist>
                      <Input
                        placeholder={t('component_code')}
                        list="bom-component-options"
                        value={
                          line.componentItemCode
                            ? `${line.componentItemCode} ${
                                items.find((i) => i.itemCode === line.componentItemCode)?.itemName ?? ''
                              }`.trim()
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value ?? '';
                          const code = raw.trim().slice(0, 6);
                          updateLine(idx, 'componentItemCode', /^\d{6}$/.test(code) ? code : null);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        placeholder={t('quantity')}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        placeholder={t('scrap_rate')}
                        value={line.scrapRate}
                        onChange={(e) => updateLine(idx, 'scrapRate', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="w-24">
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => removeLine(idx)}
                      >
                        {t('delete_line')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      {t('no_bom')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">{t('tree_panel')}</h2>
            </div>
            {tree.length === 0 ? (
              <p className="text-sm text-gray-500">{t('no_tree')}</p>
            ) : (
              <BomTree nodes={tree} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
