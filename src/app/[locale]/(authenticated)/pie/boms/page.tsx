'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  GitFork, 
  Layers, 
  Plus, 
  Save, 
  CheckCircle2, 
  History, 
  ArrowRight, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Search,
  Package,
  Zap
} from 'lucide-react';

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
    <div className="space-y-4">
      {nodes.map((node) => (
        <div key={node.id} className="relative">
          {level > 0 && (
            <div className="absolute -left-4 top-5 w-4 h-0.5 bg-slate-100" />
          )}
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 hover:border-indigo-200 transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Package className="size-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">{node.componentItemName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{node.componentItemCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600">{node.quantity} <span className="text-[10px] text-slate-300 uppercase">PCS</span></p>
                  <p className="text-[10px] text-slate-400 font-bold">Scrap: {node.scrapRate}%</p>
                </div>
              </div>
            </div>
            <div className="ml-6 border-l-2 border-slate-50 pl-4">
              <BomTree nodes={node.children} level={level + 1} />
            </div>
          </div>
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
  const [activeTab, setActiveTab] = useState('lines');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredExisting = existingBoms.filter(b => 
    b.parentItemCode.includes(searchQuery) || 
    b.parentItem.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadExistingBoms()}>
            {t('btn_refresh_list')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={handleSave} disabled={!parentItemCode}>
            <Save className="size-4 mr-2" /> {t('btn_save_version')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Layers className="size-5 text-indigo-400" />
                {t('archive_title')}
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
                {isLoadingExistingList ? (
                   <div className="p-12 text-center text-slate-400 italic">{t('Common.loading')}</div>
                ) : filteredExisting.map((record) => (
                  <div 
                    key={record.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${parentItemCode === record.parentItemCode ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => void loadBom(record.parentItemCode)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {record.parentItemCode}
                      </span>
                      {record.isActive && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded uppercase tracking-tighter flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{record.parentItem.itemName}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{t('col_version')}: {record.version}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{record._count.lines} {t('col_components')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_designer')} */}
        <div className="lg:col-span-8 space-y-8">
          {parentItemCode ? (
            <>
              {/* {t('config_area')} */}
              <div className="grid gap-4 md:grid-cols-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('label_current_design')}</label>
                  <p className="text-sm font-bold text-slate-900">{items.find(i => i.itemCode === parentItemCode)?.itemName}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_version_no')}</label>
                  <Input 
                    value={version} 
                    onChange={(e) => setVersion(e.target.value)}
                    className="h-10 bg-slate-50 border-none font-bold text-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_effective_date')}</label>
                  <Input 
                    type="date"
                    value={effectiveDate} 
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="h-10 bg-slate-50 border-none font-bold"
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="lines" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Layers className="size-4 mr-2" /> {t('tab_lines')}
                  </TabsTrigger>
                  <TabsTrigger value="tree" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <GitFork className="size-4 mr-2" /> {t('tab_tree')}
                  </TabsTrigger>
                  <TabsTrigger value="diff" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <History className="size-4 mr-2" /> {t('tab_diff')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('card_lines_title')}</h3>
                       <Button size="sm" variant="ghost" className="text-indigo-600 font-bold" onClick={handleAddLine}>
                         <Plus className="size-4 mr-1" /> {t('btn_add_component')}
                       </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 w-16"></TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_component_info')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_qty')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_scrap')}</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('Common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, idx) => (
                          <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8">
                               <div className="flex flex-col gap-1">
                                 <button disabled={idx === 0} onClick={() => moveLine(idx, 'up')} className="text-slate-300 hover:text-indigo-600 disabled:opacity-30">
                                   <ChevronUp className="size-4" />
                                 </button>
                                 <button disabled={idx === lines.length - 1} onClick={() => moveLine(idx, 'down')} className="text-slate-300 hover:text-indigo-600 disabled:opacity-30">
                                   <ChevronDown className="size-4" />
                                 </button>
                               </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2 min-w-[200px]">
                                <datalist id={`bom-comp-${idx}`}>
                                  {items.filter(i => i.itemCode !== parentItemCode).map(i => (
                                    <option key={i.itemCode} value={`${i.itemCode} ${i.itemName}`} />
                                  ))}
                                </datalist>
                                <Input 
                                  list={`bom-comp-${idx}`}
                                  placeholder={t('field_comp_placeholder')}
                                  value={line.componentItemCode ? `${line.componentItemCode} ${items.find(i => i.itemCode === line.componentItemCode)?.itemName ?? ''}` : ''}
                                  onChange={(e) => {
                                    const code = e.target.value.split(' ')[0];
                                    updateLine(idx, 'componentItemCode', /^\d{6}$/.test(code) ? code : null);
                                  }}
                                  className="bg-slate-50 border-none font-bold text-xs h-9"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={line.quantity} 
                                onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                                className="w-24 h-9 bg-slate-50 border-none font-black text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  value={line.scrapRate} 
                                  onChange={(e) => updateLine(idx, 'scrapRate', Number(e.target.value))}
                                  className="w-20 h-9 bg-slate-50 border-none font-bold text-center text-slate-500"
                                />
                                <span className="text-[10px] font-bold text-slate-300">%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                               <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => removeLine(idx)}>
                                 <Trash2 className="size-4" />
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="tree">
                   <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                      {tree.length === 0 ? (
                        <div className="py-20 text-center">
                           <GitFork className="size-16 text-slate-100 mx-auto mb-4" />
                           <p className="text-sm font-black text-slate-300 uppercase italic">{t('visual_empty')}</p>
                        </div>
                      ) : (
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-4">
                           <BomTree nodes={tree} />
                        </div>
                      )}
                   </Card>
                </TabsContent>

                <TabsContent value="diff">
                   {/* Diff logic container */}
                   <Card className="border-none shadow-sm rounded-3xl p-6 bg-white space-y-6">
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{t('diff_base')}</p>
                            <p className="font-bold text-indigo-600">{selectedVersion}</p>
                         </div>
                         <ArrowRight className="text-slate-300" />
                         <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{t('diff_compare')}</p>
                            <Select value={compareVersion || ''} onValueChange={(v) => setCompareVersion(v)}>
                               <SelectTrigger className="w-32 bg-white border-none font-bold h-8"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 {versions.filter(v => v.version !== selectedVersion).map(v => (
                                   <SelectItem key={v.id} value={v.version}>{v.version}</SelectItem>
                                 ))}
                               </SelectContent>
                            </Select>
                         </div>
                      </div>
                      {diffLines.length > 0 ? (
                        <Table>
                          <TableHeader><TableRow><TableHead>{t('parent_item')}</TableHead><TableHead>{t('col_change_type')}</TableHead><TableHead>{t('col_qty_change')}</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {diffLines.map((d, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs font-bold">{d.componentItemCode} {d.componentItemName}</TableCell>
                                <TableCell>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                    d.changeType === 'added' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>{d.changeType}</span>
                                </TableCell>
                                <TableCell className="text-xs font-mono">{d.fromQuantity} → {d.toQuantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : <p className="text-center py-12 text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('diff_no_change')}</p>}
                   </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <Zap className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
