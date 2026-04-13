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
  ShoppingBag, 
  Truck, 
  Receipt, 
  Wallet, 
  Plus, 
  Save, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  User, 
  MoreVertical,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react';

type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'CLOSED'
  | 'CANCELLED';

interface SalesOrderRow {
  id: string;
  orderNo: string;
  customerName: string;
  skuItemCode: string;
  orderedQty: number;
  unitPrice: string;
  currency: string;
  status: SalesOrderStatus;
  dueDate: string | null;
  shippedQty: number;
  billedAmount: number;
  receivedAmount: number;
  arAmount: number;
}

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  salesOrderId: string;
  amount: string;
  paidAmount: string;
  status: string;
  dueDate: string | null;
}

interface DashboardPayload {
  summary: {
    orderCount: number;
    revenueTotal: number;
    billedTotal: number;
    receivedTotal: number;
    arTotal: number;
    shippedQtyTotal: number;
  };
  recentInvoices: InvoiceRow[];
}

interface WarehouseOption {
  id: string;
  warehouseCode: string;
  locations: { id: string; locationCode: string }[];
}

const STATUS_OPTIONS: SalesOrderStatus[] = ['DRAFT', 'CONFIRMED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'CLOSED', 'CANCELLED'];

export default function O2CPage() {
  const t = useTranslations('O2c');
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [orderNo, setOrderNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [skuItemCode, setSkuItemCode] = useState('');
  const [orderedQty, setOrderedQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [currency, setCurrency] = useState('CNY');
  const [status, setStatus] = useState<SalesOrderStatus>('DRAFT');
  const [dueDate, setDueDate] = useState('');

  const [shipQty, setShipQty] = useState('1');
  const [shipLocationId, setShipLocationId] = useState('');
  const [shipLogisticsNo, setShipLogisticsNo] = useState('');
  const [shipOperator, setShipOperator] = useState('');

  const [invoiceAmount, setInvoiceAmount] = useState('0');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceBy, setInvoiceBy] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentBy, setPaymentBy] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const [ordersRes, dashboardRes, whRes] = await Promise.all([
        fetch('/api/o2c/orders', { cache: 'no-store' }),
        fetch('/api/o2c/dashboard', { cache: 'no-store' }),
        fetch('/api/inventory/warehouses', { cache: 'no-store' }),
      ]);
      if (!ordersRes.ok || !dashboardRes.ok || !whRes.ok) {
        setRows([]);
        setDashboard(null);
        setWarehouses([]);
        setListError(t('load_failed'));
        return;
      }
      const orders = (await ordersRes.json()) as SalesOrderRow[];
      const db = (await dashboardRes.json()) as DashboardPayload;
      const wh = (await whRes.json()) as WarehouseOption[];
      setRows(orders);
      setDashboard(db);
      setWarehouses(wh);
      if (!selectedOrderId && orders[0]) setSelectedOrderId(orders[0].id);
    } catch {
      setRows([]);
      setDashboard(null);
      setWarehouses([]);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedOrder = useMemo(() => rows.find((row) => row.id === selectedOrderId) ?? null, [rows, selectedOrderId]);
  const invoicesForOrder = useMemo(
    () => (dashboard?.recentInvoices ?? []).filter((entry) => entry.salesOrderId === selectedOrderId),
    [dashboard?.recentInvoices, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedInvoiceId && invoicesForOrder[0]) setSelectedInvoiceId(invoicesForOrder[0].id);
    if (selectedInvoiceId && !invoicesForOrder.find((i) => i.id === selectedInvoiceId)) {
      setSelectedInvoiceId(invoicesForOrder[0]?.id ?? '');
    }
  }, [invoicesForOrder, selectedInvoiceId]);

  const mapError = (code: string) => {
    const m: Record<string, string> = {
      SALES_ORDER_NO_INVALID: 'order_no_invalid',
      SALES_ORDER_NO_DUPLICATE: 'order_no_duplicate',
      CUSTOMER_NAME_REQUIRED: 'customer_required',
      SKU_ITEM_CODE_INVALID: 'sku_invalid',
      SKU_NOT_FOUND: 'sku_not_found',
      ORDERED_QTY_INVALID: 'qty_invalid',
      UNIT_PRICE_INVALID: 'price_invalid',
      CURRENCY_INVALID: 'currency_invalid',
      SALES_ORDER_STATUS_INVALID: 'status_invalid',
      DUE_DATE_INVALID: 'due_date_invalid',
      SO_STATUS_INVALID: 'so_status_invalid',
      SHIP_QTY_INVALID: 'ship_qty_invalid',
      SHIP_QTY_EXCEEDS_ORDER: 'ship_qty_exceeds',
      INVENTORY_NOT_ENOUGH: 'inventory_not_enough',
      LOCATION_REQUIRED: 'location_required',
      INVOICE_AMOUNT_INVALID: 'invoice_amount_invalid',
      INVOICE_AMOUNT_EXCEEDS_ORDER: 'invoice_amount_exceeds',
      PAYMENT_AMOUNT_INVALID: 'payment_amount_invalid',
      PAYMENT_EXCEEDS_INVOICE: 'payment_amount_exceeds',
      INVOICE_NOT_FOUND: 'invoice_not_found',
      SALES_ORDER_NOT_FOUND: 'sales_order_not_found',
    };
    return m[code] ? t(m[code]) : t('save_failed');
  };

  const createOrder = async () => {
    setIsSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      const res = await fetch('/api/o2c/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo,
          customerName,
          skuItemCode,
          orderedQty: Number.parseInt(orderedQty, 10),
          unitPrice: Number.parseFloat(unitPrice),
          currency,
          status,
          dueDate: dueDate || null,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFormError(mapError(payload?.error ?? ''));
        return;
      }
      setOrderNo('');
      setCustomerName('');
      setSkuItemCode('');
      setOrderedQty('1');
      setUnitPrice('0');
      setCurrency('CNY');
      setStatus('DRAFT');
      setDueDate('');
      setMessage(t('create_success'));
      setIsCreateDialogOpen(false);
      await loadData();
    } catch {
      setFormError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const doAction = async (url: string, payload: Record<string, unknown>, successMsg: string) => {
    setActionSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFormError(mapError(body?.error ?? ''));
        return;
      }
      setMessage(successMsg);
      await loadData();
    } catch {
      setFormError(t('save_failed'));
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredOrders = rows.filter(r => 
    r.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: SalesOrderStatus) => {
    const styles: Record<SalesOrderStatus, string> = {
      DRAFT: 'bg-slate-100 text-slate-600',
      CONFIRMED: 'bg-indigo-50 text-indigo-600',
      PARTIALLY_SHIPPED: 'bg-amber-50 text-amber-600',
      SHIPPED: 'bg-emerald-50 text-emerald-600',
      CLOSED: 'bg-slate-900 text-white',
      CANCELLED: 'bg-red-50 text-red-600',
    };
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">销售与订单中心</h1>
          <p className="text-slate-500 font-medium">Order to Cash (O2C) Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => loadData()}>
            刷新数据
          </Button>
          <Button className="font-bold bg-indigo-600 shadow-lg shadow-indigo-100" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> 新增销售订单
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-6 md:grid-cols-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">订单总数</p>
          <p className="text-2xl font-black text-slate-900">{dashboard?.summary.orderCount ?? 0}</p>
          <div className="mt-2 flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
            <TrendingUp className="size-3" /> +12%
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">销售总额</p>
          <p className="text-2xl font-black text-slate-900">¥{(dashboard?.summary.revenueTotal ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">已发货</p>
          <p className="text-2xl font-black text-slate-900">{dashboard?.summary.shippedQtyTotal ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">已开票</p>
          <p className="text-2xl font-black text-slate-900">¥{(dashboard?.summary.billedTotal ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">已收款</p>
          <p className="text-2xl font-black text-slate-900">¥{(dashboard?.summary.receivedTotal ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">应收账款</p>
          <p className="text-2xl font-black text-red-600">¥{(dashboard?.summary.arTotal ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左侧：订单档案库 */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShoppingBag className="size-5 text-indigo-400" />
                销售订单档案
              </CardTitle>
              <div className="relative mt-4">
                <Input 
                  className="bg-white/10 border-none text-white placeholder:text-slate-500 h-10 rounded-xl pl-10"
                  placeholder="搜索单号、客户名称..."
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
                ) : filteredOrders.map((row) => (
                  <div 
                    key={row.id} 
                    className={`p-5 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${selectedOrderId === row.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'}`}
                    onClick={() => setSelectedOrderId(row.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {row.orderNo}
                      </span>
                      {getStatusBadge(row.status)}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{row.customerName}</h4>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <Package className="size-3" /> SKU: {row.skuItemCode}
                         </p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                           <TrendingUp className="size-3" /> 数量: {row.orderedQty}
                         </p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">交期: {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && !isLoading && (
                   <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">No matching orders</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：订单控制台 */}
        <div className="lg:col-span-8 space-y-8">
          {selectedOrder ? (
            <>
              {/* 快速概览与核心操作 */}
              <div className="grid gap-4 md:grid-cols-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">客户</label>
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">订单总额</label>
                  <p className="text-sm font-bold text-indigo-600">¥{(Number(selectedOrder.unitPrice) * selectedOrder.orderedQty).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">收款状态</label>
                  <div className="flex items-center gap-2">
                     <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all" 
                          style={{ width: `${Math.min(100, (selectedOrder.receivedAmount / (Number(selectedOrder.unitPrice) * selectedOrder.orderedQty)) * 100)}%` }} 
                        />
                     </div>
                     <span className="text-[10px] font-black text-slate-500">
                       {((selectedOrder.receivedAmount / (Number(selectedOrder.unitPrice) * selectedOrder.orderedQty)) * 100).toFixed(0)}%
                     </span>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-black text-[10px] uppercase tracking-widest border-2"
                    disabled={actionSubmitting || selectedOrder.status !== 'DRAFT'}
                    onClick={() => void doAction(`/api/o2c/orders/${selectedOrderId}/confirm`, {}, t('confirm_success'))}
                  >
                    {selectedOrder.status === 'DRAFT' ? '确认订单' : '已确认'}
                  </Button>
                </div>
              </div>

              {formError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{formError}</div>}
              {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{message}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <ShoppingBag className="size-4 mr-2" /> 订单详情
                  </TabsTrigger>
                  <TabsTrigger value="execution" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Truck className="size-4 mr-2" /> 发货与物流
                  </TabsTrigger>
                  <TabsTrigger value="finance" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">
                    <Wallet className="size-4 mr-2" /> 财务与回款
                  </TabsTrigger>
                </TabsList>

                {/* 订单详情 Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                     <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-l-4 border-indigo-600 pl-4">产品信息</h3>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500">产品编码</span>
                              <span className="text-xs font-black text-slate-900">{selectedOrder.skuItemCode}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500">订购数量</span>
                              <span className="text-xs font-black text-slate-900">{selectedOrder.orderedQty} PCS</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-500">单价</span>
                              <span className="text-xs font-black text-indigo-600">{selectedOrder.unitPrice} {selectedOrder.currency}</span>
                           </div>
                           <div className="flex justify-between items-center py-2">
                              <span className="text-xs text-slate-500">合计总额</span>
                              <span className="text-sm font-black text-indigo-600">¥{(Number(selectedOrder.unitPrice) * selectedOrder.orderedQty).toLocaleString()}</span>
                           </div>
                        </div>
                     </Card>
                     <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-l-4 border-indigo-600 pl-4">进度追踪</h3>
                        <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
                           <div className="flex items-start gap-4 relative z-10">
                              <div className={`size-6 rounded-full flex items-center justify-center ${selectedOrder.status !== 'CANCELLED' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                 <CheckCircle2 className="size-3" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900">订单已确认</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase">PROCESS STARTED</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className={`size-6 rounded-full flex items-center justify-center ${selectedOrder.shippedQty > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                 <Truck className="size-3" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900">产品已发货</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedOrder.shippedQty}/{selectedOrder.orderedQty} PCS</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className={`size-6 rounded-full flex items-center justify-center ${selectedOrder.arAmount === 0 && selectedOrder.receivedAmount > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                 <DollarSign className="size-3" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900">账款已结清</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase">PAYMENT COMPLETED</p>
                              </div>
                           </div>
                        </div>
                     </Card>
                  </div>
                </TabsContent>

                {/* 发货与物流 Tab */}
                <TabsContent value="execution" className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-3">
                     <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl p-6 bg-white">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">执行发货</h3>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本次发货数量</label>
                              <Input 
                                type="number"
                                value={shipQty} 
                                onChange={(e) => setShipQty(e.target.value)}
                                className="h-10 bg-slate-50 border-none font-bold"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">出库仓库/库位</label>
                              <select 
                                aria-label="选择库位"
                                className="w-full h-10 rounded-xl bg-slate-50 border-none px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none" 
                                value={shipLocationId} 
                                onChange={(e) => setShipLocationId(e.target.value)}
                              >
                                <option value="">选择库位</option>
                                {warehouses.flatMap((w) => w.locations.map((loc) => (
                                  <option key={loc.id} value={loc.id}>{w.warehouseCode}/{loc.locationCode}</option>
                                )))}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">物流单号</label>
                              <Input 
                                value={shipLogisticsNo} 
                                onChange={(e) => setShipLogisticsNo(e.target.value)}
                                className="h-10 bg-slate-50 border-none font-bold text-xs"
                                placeholder="快递单号..."
                              />
                           </div>
                           <Button 
                             className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-slate-100"
                             disabled={actionSubmitting || !selectedOrderId}
                             onClick={() =>
                               void doAction(
                                 `/api/o2c/orders/${selectedOrderId}/shipments`,
                                 { shippedQty: Number.parseInt(shipQty, 10), locationId: shipLocationId, logisticsNo: shipLogisticsNo, operator: shipOperator },
                                 t('ship_success')
                               )
                             }
                           >
                             确认出库发货
                           </Button>
                        </div>
                     </Card>
                     <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6 bg-white overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">发货历史</h3>
                           <History className="size-4 text-slate-300" />
                        </div>
                        <div className="overflow-x-auto -mx-6">
                           <Table>
                              <TableHeader>
                                 <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-6 text-[10px] font-black uppercase text-slate-400">发货时间</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">数量</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">物流单号</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pr-6">经办人</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {/* 注意：这里的发货历史在现有 API 中似乎没有直接暴露，仅在 shippedQty 中体现，
                                     如果需要详细列表，可能需要后续扩展 API */}
                                 <TableRow className="border-b border-slate-50">
                                    <TableCell colSpan={4} className="py-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">
                                       No shipment records found
                                    </TableCell>
                                 </TableRow>
                              </TableBody>
                           </Table>
                        </div>
                     </Card>
                  </div>
                </TabsContent>

                {/* 财务与回款 Tab */}
                <TabsContent value="finance" className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                     <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">开票登记</h3>
                        <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">开票金额</label>
                                 <Input 
                                   type="number"
                                   value={invoiceAmount} 
                                   onChange={(e) => setInvoiceAmount(e.target.value)}
                                   className="h-10 bg-slate-50 border-none font-black"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">开票日期</label>
                                 <Input 
                                   type="date"
                                   value={invoiceDueDate} 
                                   onChange={(e) => setInvoiceDueDate(e.target.value)}
                                   className="h-10 bg-slate-50 border-none font-bold"
                                 />
                              </div>
                           </div>
                           <Button 
                             className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-slate-100"
                             disabled={actionSubmitting || !selectedOrderId}
                             onClick={() =>
                               void doAction(
                                 `/api/o2c/orders/${selectedOrderId}/invoices`,
                                 { amount: Number.parseFloat(invoiceAmount), dueDate: invoiceDueDate || null, createdBy: invoiceBy },
                                 t('invoice_success')
                               )
                             }
                           >
                             生成并推送发票
                           </Button>
                        </div>
                     </Card>
                     <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">收款登记</h3>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">选择待收发票</label>
                              <select 
                                aria-label="选择发票"
                                className="w-full h-10 rounded-xl bg-slate-50 border-none px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none" 
                                value={selectedInvoiceId} 
                                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                              >
                                <option value="">选择发票</option>
                                {invoicesForOrder.map((inv) => (
                                  <option key={inv.id} value={inv.id}>{inv.invoiceNo} (¥{Number(inv.amount).toLocaleString()})</option>
                                ))}
                              </select>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">收款金额</label>
                                 <Input 
                                   type="number"
                                   value={paymentAmount} 
                                   onChange={(e) => setPaymentAmount(e.target.value)}
                                   className="h-10 bg-slate-50 border-none font-black"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">支付方式</label>
                                 <Input 
                                   value={paymentMethod} 
                                   onChange={(e) => setPaymentMethod(e.target.value)}
                                   className="h-10 bg-slate-50 border-none font-bold text-xs"
                                   placeholder="银行汇款/现金..."
                                 />
                              </div>
                           </div>
                           <Button 
                             className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100"
                             disabled={actionSubmitting || !selectedInvoiceId}
                             onClick={() =>
                               void doAction(
                                 `/api/o2c/invoices/${selectedInvoiceId}/payments`,
                                 { amount: Number.parseFloat(paymentAmount), method: paymentMethod, referenceNo: paymentRef, createdBy: paymentBy },
                                 t('payment_success')
                               )
                             }
                           >
                             确认收款并销账
                           </Button>
                        </div>
                     </Card>

                     <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6 bg-white overflow-hidden">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">开票记录与状态</h3>
                        <div className="overflow-x-auto -mx-6">
                           <Table>
                              <TableHeader>
                                 <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-6 text-[10px] font-black uppercase text-slate-400">发票单号</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">金额</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">已收</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">状态</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pr-6">应收日期</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {invoicesForOrder.map((inv) => (
                                    <TableRow key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                       <TableCell className="pl-6 text-xs font-black text-slate-900">{inv.invoiceNo}</TableCell>
                                       <TableCell className="text-xs font-black text-indigo-600">¥{Number(inv.amount).toLocaleString()}</TableCell>
                                       <TableCell className="text-xs font-black text-emerald-600">¥{Number(inv.paidAmount).toLocaleString()}</TableCell>
                                       <TableCell>
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                             {inv.status}
                                          </span>
                                       </TableCell>
                                       <TableCell className="pr-6 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                                       </TableCell>
                                    </TableRow>
                                 ))}
                                 {invoicesForOrder.length === 0 && (
                                    <TableRow>
                                       <TableCell colSpan={5} className="py-12 text-center text-slate-300 italic text-xs uppercase font-black tracking-widest">
                                          No invoices found for this order
                                       </TableCell>
                                    </TableRow>
                                 )}
                              </TableBody>
                           </Table>
                        </div>
                     </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 min-h-[500px]">
               <ShoppingBag className="size-20 text-slate-50 mb-6" />
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">请从左侧选择一个订单查看详情</h3>
               <p className="text-slate-400 text-sm mt-2">在这里处理订单确认、发货、开票及收款全流程</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建订单对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">创建销售订单</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">录入新的销售契约，驱动生产与执行</DialogDescription>
           </DialogHeader>
           <div className="grid gap-6 mt-6 md:grid-cols-2">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">订单单号</label>
                 <Input 
                   value={orderNo} 
                   onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="如：SO-2024001"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">客户名称</label>
                 <Input 
                   value={customerName} 
                   onChange={(e) => setCustomerName(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="如：特斯拉(上海)"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">产品 SKU 编码</label>
                 <Input 
                   value={skuItemCode} 
                   onChange={(e) => setSkuItemCode(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                   placeholder="选择产品..."
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">订购数量</label>
                    <Input 
                      type="number"
                      value={orderedQty} 
                      onChange={(e) => setOrderedQty(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">销售单价</label>
                    <Input 
                      type="number"
                      value={unitPrice} 
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="h-12 bg-slate-50 border-none font-black text-center"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">交货日期</label>
                 <Input 
                   type="date"
                   value={dueDate} 
                   onChange={(e) => setDueDate(e.target.value)}
                   className="h-12 bg-slate-50 border-none font-bold"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">结算币种</label>
                 <Input 
                   value={currency} 
                   onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                   className="h-12 bg-slate-50 border-none font-bold text-center"
                 />
              </div>
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">初始状态</label>
                 <select 
                   aria-label="状态"
                   className="w-full h-12 rounded-xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" 
                   value={status} 
                   onChange={(e) => setStatus(e.target.value as SalesOrderStatus)}
                 >
                   {STATUS_OPTIONS.map((entry) => (
                     <option key={entry} value={entry}>{entry}</option>
                   ))}
                 </select>
              </div>
           </div>
           {formError && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-4">{formError}</p>}
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
                onClick={() => void createOrder()}
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '确认创建订单'}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
