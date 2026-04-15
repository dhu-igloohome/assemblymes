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
  const tc = useTranslations('Common');
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
  const [currency, setCurrency] = useState('CNY');
  const [expectedDate, setExpectedDate] = useState('');
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
      PURCHASE_ORDER_RECEIVE_FAILED: 'receive_failed_detail',
    };
    return map[code] ? t(map[code]) : (code ? `${t('save_failed')}: ${code}` : t('save_failed'));
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{t('center_title')}</h1>
          <p className="text-slate-500 font-medium">{t('center_desc')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => void loadData()}>
            {tc('refresh')}
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('btn_add_po')}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* {t('left_archive')} */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShoppingCart className="size-5 text-indigo-400" />
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
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 italic">{tc('loading')}</div>
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
                           <Package className="size-3" /> {t('lines_label')}: {row.lines.length} {tc('view_details')}
                         </p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Truck className="size-3" /> {t('supplier_label')}: {row.supplier.supplierCode}
                         </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
                {filteredPOs.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">{t('no_matching_records')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* {t('right_workbench')} */}
        <div className="lg:col-span-8 space-y-8">
          {selectedPo ? (
            <>
              {/* {t('core_info')} */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('supplier_label')}</label>
                  <p className="text-sm font-bold text-slate-900">{selectedPo.supplier.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('po_no_label')}</label>
                  <p className="text-sm font-bold text-indigo-600">{selectedPo.poNo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('inbound_progress')}</label>
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
                    {selectedPo.status === 'DRAFT' ? t('btn_confirm_release') : t('released')}
                  </Button>
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}
              {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{message}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <ShoppingCart className="size-4 mr-2" /> {t('tab_lines')}
                  </TabsTrigger>
                  <TabsTrigger value="receiving" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <PackageCheck className="size-4 mr-2" /> {t('tab_execution')}
                  </TabsTrigger>
                </TabsList>

                {/* {t('tab_lines')} */}
                <TabsContent value="overview" className="space-y-6">
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tab_lines')}</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_item')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_ordered')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_received')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('col_pending')}</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">{tc('status')}</TableHead>
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
                                   <CheckCircle2 className="size-3" /> {t('status_cleared')}
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-black text-amber-500 uppercase flex items-center justify-end gap-1">
                                   <Clock className="size-3" /> {t('status_receiving')}
                                 </span>
                               )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* {t('tab_execution')} */}
                <TabsContent value="receiving" className="space-y-6">
                   <div className="grid gap-6 lg:grid-cols-12">
                      <div className="lg:col-span-5 space-y-6">
                         <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{t('inbound_registration')}</h3>
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_select_item')}</label>
                                  <select 
                                    aria-label={t('field_select_item')}
                                    className="w-full h-12 rounded-xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" 
                                    value={selectedLineId} 
                                    onChange={(e) => setSelectedLineId(e.target.value)}
                                  >
                                    <option value="">{t('field_select_item')}</option>
                                    {selectedPo.lines.map((line) => (
                                      <option key={line.id} value={line.id}>{line.itemCode} ({t('col_pending')}: {Number(line.orderedQty) - Number(line.receivedQty)})</option>
                                    ))}
                                  </select>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_receive_qty')}</label>
                                     <Input 
                                       type="number"
                                       value={receiveQty} 
                                       onChange={(e) => setReceiveQty(e.target.value)}
                                       className="h-12 bg-slate-50 border-none font-black text-center"
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_location')}</label>
                                     <select 
                                       aria-label={t('field_location')}
                                       className="w-full h-12 rounded-xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-xs" 
                                       value={locationId} 
                                       onChange={(e) => setLocationId(e.target.value)}
                                     >
                                       <option value="">{t('field_location')}</option>
                                       {warehouses.flatMap((w) =>
                                         w.locations.map((loc) => (
                                           <option key={loc.id} value={loc.id}>{w.warehouseCode}/{loc.locationCode}</option>
                                         ))
                                       )}
                                     </select>
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_batch_no')}</label>
                                  <Input 
                                    value={batchNo} 
                                    onChange={(e) => setBatchNo(e.target.value)}
                                    className="h-12 bg-slate-50 border-none font-bold text-sm"
                                    placeholder={t('field_batch_placeholder')}
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
                                 {t('btn_confirm_inbound')}
                               </Button>
                            </div>
                         </Card>
                      </div>
                      <div className="lg:col-span-7">
                         <Card className="border-none shadow-sm rounded-3xl p-8 bg-slate-900 text-white h-full relative overflow-hidden">
                            <div className="relative z-10">
                               <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-8">{t('inbound_guide')}</h3>
                               <div className="space-y-8">
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">1</div>
                                     <div>
                                        <p className="font-bold">{t('guide_check_delivery')}</p>
                                        <p className="text-xs text-slate-400">{t('guide_check_delivery_desc')}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">2</div>
                                     <div>
                                        <p className="font-bold">{t('guide_count_qty')}</p>
                                        <p className="text-xs text-slate-400">{t('guide_count_qty_desc')}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-indigo-400">3</div>
                                     <div>
                                        <p className="font-bold">{t('guide_system_post')}</p>
                                        <p className="text-xs text-slate-400">{t('guide_system_post_desc')}</p>
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                                  <div className="flex justify-between items-center mb-4">
                                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('today_received')}</span>
                                     <TrendingUp className="size-4 text-emerald-400" />
                                  </div>
                                  <p className="text-3xl font-black">{rows.reduce((acc, po) => acc + po.lines.reduce((lAcc, l) => lAcc + Number(l.receivedQty), 0), 0)} <span className="text-xs font-normal text-slate-500 uppercase ml-2">{t('units_today')}</span></p>
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
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">{t('select_detail')}</h3>
               <p className="text-slate-400 text-sm mt-2">{t('select_detail_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* {t('dialog_create')} */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('dialog_create_po')}</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">{t('dialog_create_po_desc')}</DialogDescription>
           </DialogHeader>
           <div className="grid gap-6 mt-6 md:grid-cols-2">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_po_no')}</label>
                 <Input 
                   value={poNo} 
                   onChange={(e) => setPoNo(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="e.g. PO2024001"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_supplier_code')}</label>
                    <Input 
                      value={supplierCode} 
                      onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                      className="h-12 bg-slate-50 border-none font-bold"
                      placeholder="SUP001"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_supplier_name')}</label>
                    <Input 
                      value={supplierName} 
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-bold"
                      placeholder={t('field_supplier_name')}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_sku')}</label>
                 <Input 
                   value={itemCode} 
                   onChange={(e) => setItemCode(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="SKU-001"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_qty')}</label>
                    <Input 
                      type="number"
                      value={orderedQty} 
                      onChange={(e) => setOrderedQty(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_price')}</label>
                    <Input 
                      type="number"
                      value={unitPrice} 
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_buyer')}</label>
                 <Input 
                   value={createdBy} 
                   onChange={(e) => setCreatedBy(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder={t('field_buyer')}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_due_date')}</label>
                 <Input 
                   type="date"
                   value={expectedDate} 
                   onChange={(e) => setExpectedDate(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold" 
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('field_currency')}</label>
                 <Input 
                   value={currency} 
                   onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold text-center"
                   placeholder="CNY"
                 />
              </div>
              <div className="md:col-span-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                 <span className="text-xs font-black text-indigo-400 uppercase">{t('order_est_total')}</span>
                 <span className="text-xl font-black text-indigo-600">
                    {currency} {(Number(orderedQty) * Number(unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </span>
              </div>
           </div>
           {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-4">{error}</p>}
          <div className="flex gap-4 mt-8">
             <Button 
               variant="outline"
               className="flex-1 h-14 font-black rounded-2xl"
               onClick={() => setIsCreateDialogOpen(false)}
             >
               {tc('cancel')}
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
                     currency,
                     expectedDate: expectedDate || null,
                   },
                   t('create_success')
                 )
               }
               disabled={isSubmitting}
             >
               {isSubmitting ? tc('submitting') : t('btn_publish_po')}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
