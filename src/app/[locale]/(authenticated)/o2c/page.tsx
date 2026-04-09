'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  return (
    <div className="space-y-6 p-8 md:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Metric label={t('metric_orders')} value={dashboard?.summary.orderCount ?? 0} />
        <Metric label={t('metric_revenue')} value={(dashboard?.summary.revenueTotal ?? 0).toFixed(2)} />
        <Metric label={t('metric_shipped_qty')} value={dashboard?.summary.shippedQtyTotal ?? 0} />
        <Metric label={t('metric_billed')} value={(dashboard?.summary.billedTotal ?? 0).toFixed(2)} />
        <Metric label={t('metric_received')} value={(dashboard?.summary.receivedTotal ?? 0).toFixed(2)} />
        <Metric label={t('metric_ar')} value={(dashboard?.summary.arTotal ?? 0).toFixed(2)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('create_order')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input placeholder={t('order_no')} value={orderNo} onChange={(e) => setOrderNo(e.target.value.toUpperCase())} />
          <Input placeholder={t('customer_name')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <Input placeholder={t('sku_item_code')} value={skuItemCode} onChange={(e) => setSkuItemCode(e.target.value)} />
          <Input placeholder={t('ordered_qty')} value={orderedQty} onChange={(e) => setOrderedQty(e.target.value)} />
          <Input placeholder={t('unit_price')} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Input placeholder={t('currency')} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          <select aria-label={t('status')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as SalesOrderStatus)}>
            {STATUS_OPTIONS.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <Input type="date" placeholder={t('due_date')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button className="mt-4" disabled={isSubmitting} onClick={() => void createOrder()}>
          {isSubmitting ? t('submitting') : t('create')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('action_console')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select aria-label={t('select_order')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
            <option value="">{t('select_order')}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>{row.orderNo} - {row.customerName}</option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={actionSubmitting || !selectedOrderId}
            onClick={() => void doAction(`/api/o2c/orders/${selectedOrderId}/confirm`, {}, t('confirm_success'))}
          >
            {actionSubmitting ? t('submitting') : t('confirm_order')}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Input placeholder={t('ship_qty')} value={shipQty} onChange={(e) => setShipQty(e.target.value)} />
          <select aria-label={t('select_location')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={shipLocationId} onChange={(e) => setShipLocationId(e.target.value)}>
            <option value="">{t('select_location')}</option>
            {warehouses.flatMap((w) => w.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{w.warehouseCode}/{loc.locationCode}</option>
            )))}
          </select>
          <Input placeholder={t('logistics_no')} value={shipLogisticsNo} onChange={(e) => setShipLogisticsNo(e.target.value)} />
          <Input placeholder={t('operator')} value={shipOperator} onChange={(e) => setShipOperator(e.target.value)} />
        </div>
        <Button
          className="mt-3"
          disabled={actionSubmitting || !selectedOrderId}
          onClick={() =>
            void doAction(
              `/api/o2c/orders/${selectedOrderId}/shipments`,
              { shippedQty: Number.parseInt(shipQty, 10), locationId: shipLocationId, logisticsNo: shipLogisticsNo, operator: shipOperator },
              t('ship_success')
            )
          }
        >
          {actionSubmitting ? t('submitting') : t('create_shipment')}
        </Button>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input placeholder={t('invoice_amount')} value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
          <Input type="date" placeholder={t('due_date')} value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} />
          <Input placeholder={t('created_by')} value={invoiceBy} onChange={(e) => setInvoiceBy(e.target.value)} />
        </div>
        <Button
          className="mt-3"
          disabled={actionSubmitting || !selectedOrderId}
          onClick={() =>
            void doAction(
              `/api/o2c/orders/${selectedOrderId}/invoices`,
              { amount: Number.parseFloat(invoiceAmount), dueDate: invoiceDueDate || null, createdBy: invoiceBy },
              t('invoice_success')
            )
          }
        >
          {actionSubmitting ? t('submitting') : t('create_invoice')}
        </Button>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select aria-label={t('select_invoice')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
            <option value="">{t('select_invoice')}</option>
            {invoicesForOrder.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.invoiceNo}</option>
            ))}
          </select>
          <Input placeholder={t('payment_amount')} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <Input placeholder={t('payment_method')} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          <Input placeholder={t('payment_reference')} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input placeholder={t('created_by')} value={paymentBy} onChange={(e) => setPaymentBy(e.target.value)} />
          <Button
            disabled={actionSubmitting || !selectedInvoiceId}
            onClick={() =>
              void doAction(
                `/api/o2c/invoices/${selectedInvoiceId}/payments`,
                { amount: Number.parseFloat(paymentAmount), method: paymentMethod, referenceNo: paymentRef, createdBy: paymentBy },
                t('payment_success')
              )
            }
          >
            {actionSubmitting ? t('submitting') : t('register_payment')}
          </Button>
        </div>
      </div>

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('list_title')}</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('order_no')}</TableHead>
                  <TableHead>{t('customer_name')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('ordered_qty')}</TableHead>
                  <TableHead>{t('shipped_qty')}</TableHead>
                  <TableHead>{t('metric_billed')}</TableHead>
                  <TableHead>{t('metric_received')}</TableHead>
                  <TableHead>{t('metric_ar')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={selectedOrder?.id === row.id ? 'bg-slate-100' : ''}>
                    <TableCell>{row.orderNo}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.orderedQty}</TableCell>
                    <TableCell>{row.shippedQty}</TableCell>
                    <TableCell>{row.billedAmount.toFixed(2)}</TableCell>
                    <TableCell>{row.receivedAmount.toFixed(2)}</TableCell>
                    <TableCell>{row.arAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">{t('empty')}</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
