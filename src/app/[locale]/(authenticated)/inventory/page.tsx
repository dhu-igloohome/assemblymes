'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Search, 
  Package, 
  MapPin, 
  ArrowRightLeft, 
  History, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  LayoutGrid
} from 'lucide-react';

type TxnType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST';

interface WarehouseRow {
  id: string;
  warehouseCode: string;
  name: string;
  locations: Array<{ id: string; locationCode: string; name: string | null }>;
}

interface BalanceRow {
  id: string;
  quantity: string;
  item: { itemCode: string; itemName: string };
  location: { locationCode: string; warehouse: { warehouseCode: string } };
}

interface TxnRow {
  id: string;
  txnType: TxnType;
  itemCode: string;
  quantity: string;
  refType: string | null;
  refNo: string | null;
  batchNo: string | null;
  createdAt: string;
}

interface WarningRow {
  itemCode: string;
  itemName: string;
  safetyStock: number;
  onHand: number;
  shortage: number;
}

interface WoMaterialRow {
  id: string;
  mode: 'ISSUE' | 'RETURN';
  itemCode: string;
  quantity: string;
  batchNo: string | null;
  createdAt: string;
  location: { locationCode: string; warehouse: { warehouseCode: string } };
}

export default function InventoryPage() {
  const t = useTranslations('Inventory');
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wRes, bRes, tRes, warnRes] = await Promise.all([
        fetch('/api/inventory/warehouses', { cache: 'no-store' }),
        fetch('/api/inventory/balances', { cache: 'no-store' }),
        fetch('/api/inventory/transactions', { cache: 'no-store' }),
        fetch('/api/inventory/warnings', { cache: 'no-store' }),
      ]);
      
      if (wRes.ok) setWarehouses(await wRes.json());
      if (bRes.ok) setBalances(await bRes.json());
      if (tRes.ok) setTxns(await tRes.json());
      if (warnRes.ok) setWarnings(await warnRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return balances;
    const q = searchQuery.toLowerCase();
    return balances.filter(b => 
      b.item.itemCode.toLowerCase().includes(q) || 
      b.item.itemName.toLowerCase().includes(q) ||
      b.location.locationCode.toLowerCase().includes(q)
    );
  }, [balances, searchQuery]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* 标题与全局搜索 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">智能库存浏览器</h1>
          <p className="text-slate-500 font-medium">Visual Inventory Management</p>
        </div>
        <div className="w-full md:w-96 relative">
          <Input 
            className="h-14 pl-12 pr-4 bg-white border-none shadow-xl rounded-2xl text-lg font-bold placeholder:text-slate-300"
            placeholder="搜索物料名称、编码或仓位..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-4.5 size-5 text-slate-400" />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
            <LayoutGrid className="size-4 mr-2" /> 库存概览
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
            <History className="size-4 mr-2" /> 变动履历
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
            <MapPin className="size-4 mr-2" /> 仓位设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* 异常警报卡片 */}
          {warnings.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {warnings.slice(0, 3).map(warn => (
                <div key={warn.itemCode} className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in-95">
                  <div className="bg-red-500 text-white p-2 rounded-xl">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-700 uppercase">{warn.itemName}</h4>
                    <p className="text-lg font-black text-red-900">缺口 {warn.shortage} PCS</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 库存网格 - 视觉化核心 */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBalances.map((row) => (
              <Card key={row.id} className="group border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all rounded-3xl overflow-hidden bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                   <div className="flex justify-between items-start">
                     <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter">
                       {row.location.warehouse.warehouseCode} / {row.location.locationCode}
                     </span>
                     <Package className="size-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
                   </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <h4 className="font-black text-slate-800 line-clamp-1">{row.item.itemName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{row.item.itemCode}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-black text-slate-900">{Number(row.quantity)}</span>
                    <div className="flex gap-1">
                       <Button size="xs" variant="ghost" className="size-8 p-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                         <ArrowDownLeft className="size-4" />
                       </Button>
                       <Button size="xs" variant="ghost" className="size-8 p-0 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">
                         <ArrowUpRight className="size-4" />
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredBalances.length === 0 && (
              <div className="col-span-full py-20 text-center">
                 <Search className="size-16 text-slate-100 mx-auto mb-4" />
                 <p className="text-sm font-black text-slate-300 uppercase italic">没有找到相关库存项</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                  <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">变动类型</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">物料信息</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">变动数量</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">关联单号</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((row) => (
                  <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <TableCell className="pl-8 py-5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        row.txnType === 'IN' ? 'bg-emerald-100 text-emerald-700' : 
                        row.txnType === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {row.txnType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900">{row.itemCode}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">BATCH: {row.batchNo || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-black text-slate-700">
                      {row.txnType === 'OUT' ? '-' : '+'}{row.quantity}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-400">
                      {row.refNo || '—'}
                    </TableCell>
                    <TableCell className="text-right pr-8 text-xs font-bold text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          {/* 仓位设置保留之前的逻辑，但使用新 UI 包装 */}
          <div className="grid gap-8 lg:grid-cols-3">
             <Card className="lg:col-span-1 border-none shadow-xl rounded-3xl p-6 bg-white">
                <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">新增仓位</h3>
                <div className="space-y-4">
                  <Input placeholder={t('warehouse_code')} value={warehouseCode} onChange={(e) => setWarehouseCode(e.target.value.toUpperCase())} className="h-12 bg-slate-50 border-none font-bold" />
                  <Input placeholder={t('warehouse_name')} value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} className="h-12 bg-slate-50 border-none font-bold" />
                  <Input placeholder={t('location_code')} value={locationCode} onChange={(e) => setLocationCode(e.target.value.toUpperCase())} className="h-12 bg-slate-50 border-none font-bold" />
                  <Button className="w-full h-14 bg-indigo-600 font-black rounded-2xl shadow-lg shadow-indigo-100 mt-4">确认创建</Button>
                </div>
             </Card>

             <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-none">
                      <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">仓库编码</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">名称</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">仓位数</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map(w => (
                      <TableRow key={w.id} className="border-b border-slate-50">
                        <TableCell className="pl-8 py-5 font-black text-slate-900">{w.warehouseCode}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">{w.name}</TableCell>
                        <TableCell><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">{w.locations.length}</span></TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className="font-black text-indigo-600">管理仓位</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
