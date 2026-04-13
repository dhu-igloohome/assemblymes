'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  PackageCheck, 
  Plus, 
  Save, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  Truck, 
  History,
  TrendingUp,
  User,
  MapPin,
  Tag,
  ChevronRight,
  Monitor
} from 'lucide-react';

interface PurchaseOrderLine {
  id: string;
  itemCode: string;
  orderedQty: string;
  receivedQty: string;
}

interface PurchaseOrderRow {
  id: string;
  poNo: string;
  status: string;
  supplier: { supplierCode: string; name: string };
  lines: PurchaseOrderLine[];
}

interface WarehouseOption {
  id: string;
  warehouseCode: string;
  locations: { id: string; locationCode: string }[];
}

export default function ProcurementPage() {
  const t = useTranslations('Procurement');
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [poNo, setPoNo] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [orderedQty, setOrderedQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [createdBy, setCreatedBy] = useState('');

  const [receiveQty, setReceiveQty] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [operator, setOperator] = useState('');
  const [batchNo, setBatchNo] = useState('');

  const selectedPo = useMemo(() => rows.find((row) => row.id === selectedPoId) ?? null, [rows, selectedPoId]);

  useEffect(() => {
    if (!selectedPo) return;
    if (!selectedLineId && selectedPo.lines[0]) setSelectedLineId(selectedPo.lines[0].id);
  }, [selectedLineId, selectedPo]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [poRes, whRes] = await Promise.all([
        fetch('/api/procurement/orders', { cache: 'no-store' }),
        fetch('/api/inventory/warehouses', { cache: 'no-store' }),
      ]);
      if (!poRes.ok || !whRes.ok) {
        setRows([]);
        setWarehouses([]);
        setError(t('load_failed'));
        return;
      }
      const poRows = (await poRes.json()) as PurchaseOrderRow[];
      setRows(poRows);
      setWarehouses((await whRes.json()) as WarehouseOption[]);
      if (!selectedPoId && poRows[0]) setSelectedPoId(poRows[0].id);
    } catch {
      setRows([]);
      setWarehouses([]);
      setError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedPoId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mapError = (code: string) => {
    const map: Record<string, string> = {
      PO_NO_INVALID: 'po_no_invalid',
      PO_NO_DUPLICATE: 'po_no_duplicate',
      SUPPLIER_CODE_INVALID: 'supplier_code_invalid',
      SUPPLIER_NAME_REQUIRED: 'supplier_name_required',
      SKU_ITEM_CODE_INVALID: 'sku_item_code_invalid',
      SKU_NOT_FOUND: 'sku_not_found',
      ORDERED_QTY_INVALID: 'ordered_qty_invalid',
      UNIT_PRICE_INVALID: 'unit_price_invalid',
      PO_STATUS_INVALID: 'po_status_invalid',
      RECEIVED_QTY_INVALID: 'receive_qty_invalid',
      RECEIVED_QTY_EXCEEDS_ORDER: 'receive_qty_exceeds',
      LOCATION_REQUIRED: 'location_required',
      LOCATION_NOT_FOUND: 'location_not_found',
      PURCHASE_ORDER_NOT_FOUND: 'po_not_found',
    };
    return map[code] ? t(map[code]) : t('save_failed');
  };

  const submitAction = async (url: string, payload: Record<string, unknown>, successMsg: string) => {
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(mapError(body?.error ?? ''));
        return;
      }
      setMessage(successMsg);
      setIsCreateDialogOpen(false);
      await loadData();
    } catch {
      setError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPOs = rows.filter(r => 
    r.poNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-600',
      CONFIRMED: 'bg-indigo-50 text-indigo-600',
      PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-600',
      RECEIVED: 'bg-emerald-50 text-emerald-600',
      CLOSED: 'bg-slate-900 text-white',
      CANCELLED: 'bg-red-50 text-red-600',
    };
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${styles[status] || 'bg-slate-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">采购与入库中心</h1>
          <p className="text-slate-500 font-medium">Procurement & Receiving Workbench</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => loadData()}>
            刷新
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> 新增采购订单
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左侧：采购订单档案 */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShoppingCart className="size-5 text-indigo-400" />
                采购订单库
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder="搜索单号、供应商..."
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
                ) : filteredPOs.map((row) => (
                  <div 
                    key={row.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedPoId === row.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedPoId(row.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.poNo}
                      </span>
                      {getStatusBadge(row.status)}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{row.supplier.name}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Package className="size-3" /> 明细: {row.lines.length} 项
                         </p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Truck className="size-3" /> 供应商: {row.supplier.supplierCode}
                         </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredPOs.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">No matching records</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：采购 workbench */}
        <div className="lg:col-span-8 space-y-8">
          {selectedPo ? (
            <>
              {/* 订单核心信息概览 */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">供应商</label>
                  <p className="text-sm font-bold text-slate-900">{selectedPo.supplier.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">订单单号</label>
                  <p className="text-sm font-bold text-indigo-600">{selectedPo.poNo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">到货进度</label>
                  <div className="flex items-center gap-2">
                     {selectedPo.lines[0] && (
                       <>
                         <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all" 
                              style={{ width: `${Math.min(100, (Number(selectedPo.lines[0].receivedQty) / Number(selectedPo.lines[0].orderedQty)) * 100)}%` }} 
                            />
                         </div>
                         <span className="text-[10px] font-black text-slate-500">
                           {((Number(selectedPo.lines[0].receivedQty) / Number(selectedPo.lines[0].orderedQty)) * 100).toFixed(0)}%
                         </span>
                       </>
                     )}
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-black text-[10px] uppercase tracking-widest border-2"
                    disabled={isSubmitting || selectedPo.status !== 'DRAFT'}
                    onClick={() => void submitAction(`/api/procurement/orders/${selectedPoId}/confirm`, { confirmedBy: operator }, t('confirm_success'))}
                  >
                    {selectedPo.status === 'DRAFT' ? '确认并下达' : '已下达'}
                  </Button>
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}
              {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{message}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <ShoppingCart className="size-4 mr-2" /> 订单明细
                  </TabsTrigger>
                  <TabsTrigger value="receiving" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <PackageCheck className="size-4 mr-2" /> 收货执行
                  </TabsTrigger>
                </TabsList>

                {/* 订单明细 Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Order Lines</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">物料编码</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">订购数量</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">已收数量</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">待收数量</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPo.lines.map((line) => (
                          <TableRow key={line.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 py-4 font-black text-slate-900">{line.itemCode}</TableCell>
                            <TableCell className="font-bold text-slate-600">{line.orderedQty}</TableCell>
                            <TableCell className="font-bold text-emerald-600">{line.receivedQty}</TableCell>
                            <TableCell className="font-bold text-amber-600">{Number(line.orderedQty) - Number(line.receivedQty)}</TableCell>
                            <TableCell className="text-right pr-8">
                               {Number(line.receivedQty) >= Number(line.orderedQty) ? (
                                 <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center justify-end gap-1">
                                   <CheckCircle2 className="size-3" /> 已结清
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-black text-amber-500 uppercase flex items-center justify-end gap-1">
                                   <Clock className="size-3" /> 收货中
                                 </span>
                               )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* 收货执行 Tab */}
                <TabsContent value="receiving" className="space-y-6">
                   <div className="grid gap-6 lg:grid-cols-12">
                      <div className="lg:col-span-5 space-y-6">
                         <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">入库登记</h3>
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">选择收货物料</label>
                                  <select 
                                    aria-label="选择物料"
                                    className="w-full h-12 rounded-xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" 
                                    value={selectedLineId} 
                                    onChange={(e) => setSelectedLineId(e.target.value)}
                                  >
                                    <option value="">选择物料</option>
                                    {selectedPo.lines.map((line) => (
                                      <option key={line.id} value={line.id}>{line.itemCode} (待收: {Number(line.orderedQty) - Number(line.receivedQty)})</option>
                                    ))}
                                  </select>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本次收货数量</label>
                                     <Input 
                                       type="number"
                                       value={receiveQty} 
                                       onChange={(e) => setReceiveQty(e.target.value)}
                                       className="h-12 bg-slate-50 border-none font-black text-center"
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">入库库位</label>
                                     <select 
                                       aria-label="选择库位"
                                       className="w-full h-12 rounded-xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-xs" 
                                       value={locationId} 
                                       onChange={(e) => setLocationId(e.target.value)}
                                     >
                                       <option value="">选择库位</option>
                                       {warehouses.flatMap((w) =>
                                         w.locations.map((loc) => (
                                           <option key={loc.id} value={loc.id}>{w.warehouseCode}/{loc.locationCode}</option>
                                         ))
                                       )}
                                     </select>
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">批次号 / 送货单号</label>
                                  <Input 
                                    value={batchNo} 
                                    onChange={(e) => setBatchNo(e.target.value)}
                                    className="h-12 bg-slate-50 border-none font-bold text-sm"
                                    placeholder="如：LOT20240410"
                                  />
                               </div>
                               <Button 
                                 className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100"
                                 disabled={isSubmitting || !selectedPoId || !selectedLineId}
                                 onClick={() =>
                                   void submitAction(
                                     `/api/procurement/orders/${selectedPoId}/receive`,
                                     { lineId: selectedLineId, locationId, receivedQty: Number.parseFloat(receiveQty), operator, batchNo },
                                     t('receive_success')
                                   )
                                 }
                               >
                                 确认收货入库
                               </Button>
                            </div>
                         </Card>
                      </div>
                      <div className="lg:col-span-7">
                         <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white h-full relative overflow-hidden">
                            <div className="relative z-10">
                               <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-8">收货指引</h3>
                               <div className="space-y-8">
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">1</div>
                                     <div>
                                        <p className="font-bold">核对送货单</p>
                                        <p className="text-xs text-slate-400">确认供应商名称与采购订单单号一致</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">2</div>
                                     <div>
                                        <p className="font-bold">清点实物数量</p>
                                        <p className="text-xs text-slate-400">检查物料是否有可见破损，确认包装完整</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">3</div>
                                     <div>
                                        <p className="font-bold">系统过账入库</p>
                                        <p className="text-xs text-slate-400">选择对应物料并指定存放库位，完成系统收货</p>
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                                  <div className="flex justify-between items-center mb-4">
                                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">今日累计收货</span>
                                     <TrendingUp className="size-4 text-emerald-400" />
                                  </div>
                                  <p className="text-3xl font-black">{rows.reduce((acc, po) => acc + po.lines.reduce((lAcc, l) => lAcc + Number(l.receivedQty), 0), 0)} <span className="text-xs font-normal text-slate-500 uppercase ml-2">Units Today</span></p>
                               </div>
                            </div>
                            <Truck className="absolute -bottom-10 -right-10 size-64 text-white/5 rotate-12" />
                         </Card>
                      </div>
                   </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <ShoppingCart className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">请从左侧选择一个采购订单查看详情</h3>
               <p className="text-slate-400 text-sm mt-2">在这里处理订单确认、收货入库以及采购明细查看</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建采购订单对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">创建采购订单</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">录入新的采购需求，驱动供应链执行</DialogDescription>
           </DialogHeader>
           <div className="grid gap-6 mt-6 md:grid-cols-2">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PO 单号</label>
                 <Input 
                   value={poNo} 
                   onChange={(e) => setPoNo(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="如：PO2024001"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">供应商编码</label>
                    <Input 
                      value={supplierCode} 
                      onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                      className="h-12 bg-slate-50 border-none font-bold"
                      placeholder="SUP001"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">供应商名称</label>
                    <Input 
                      value={supplierName} 
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-bold"
                      placeholder="供应商全称..."
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">采购物料 SKU</label>
                 <Input 
                   value={itemCode} 
                   onChange={(e) => setItemCode(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="SKU-001"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">采购数量</label>
                    <Input 
                      type="number"
                      value={orderedQty} 
                      onChange={(e) => setOrderedQty(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">采购单价</label>
                    <Input 
                      type="number"
                      value={unitPrice} 
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">采购经办人</label>
                 <Input 
                   value={createdBy} 
                   onChange={(e) => setCreatedBy(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="经办人员名称..."
                 />
              </div>
           </div>
           {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-4">{error}</p>}
           <div className="flex gap-4 mt-8">
              <Button 
                variant="outline"
                className="flex-1 h-14 font-black rounded-2xl"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button 
                className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100"
                onClick={() =>
                  void submitAction(
                    '/api/procurement/orders',
                    {
                      poNo,
                      supplierCode,
                      supplierName,
                      createdBy,
                      line: {
                        itemCode,
                        orderedQty: Number.parseFloat(orderedQty),
                        unitPrice: Number.parseFloat(unitPrice),
                      },
                    },
                    t('create_success')
                  )
                }
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '发布采购订单'}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
