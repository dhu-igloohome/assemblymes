'use client';

import { useCallback, useEffect, useState } from 'react';
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
}

interface DashboardPayload {
  summary: {
    orderCount: number;
    revenueTotal: number;
    billedTotal: number;
    receivedTotal: number;
    arTotal: number;
  };
}

const STATUS_OPTIONS: SalesOrderStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'CLOSED',
  'CANCELLED',
];

export default function O2CPage() {
  const t = useTranslations('O2C');
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const [orderNo, setOrderNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [skuItemCode, setSkuItemCode] = useState('');
  const [orderedQty, setOrderedQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [currency, setCurrency] = useState('CNY');
  const [status, setStatus] = useState<SalesOrderStatus>('DRAFT');
  const [dueDate, setDueDate] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      const [ordersRes, dashboardRes] = await Promise.all([
        fetch('/api/o2c/orders', { cache: 'no-store' }),
        fetch('/api/o2c/dashboard', { cache: 'no-store' }),
      ]);
      if (!ordersRes.ok || !dashboardRes.ok) {
        setRows([]);
        setDashboard(null);
        setListError(t('load_failed'));
        return;
      }
      setRows((await ordersRes.json()) as SalesOrderRow[]);
      setDashboard((await dashboardRes.json()) as DashboardPayload);
    } catch {
      setRows([]);
      setDashboard(null);
      setListError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    };
    return m[code] ? t(m[code]) : t('save_failed');
  };

  const createOrder = async () => {
    setIsSubmitting(true);
    setFormError('');
    setListError('');
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

  return (
    <div className="space-y-6 p-8 md:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Metric label={t('metric_orders')} value={dashboard?.summary.orderCount ?? 0} />
        <Metric label={t('metric_revenue')} value={(dashboard?.summary.revenueTotal ?? 0).toFixed(2)} />
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
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={status}
            aria-label={t('status')}
            onChange={(e) => setStatus(e.target.value as SalesOrderStatus)}
          >
            {STATUS_OPTIONS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <Input type="date" placeholder={t('due_date')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
        <Button className="mt-4" disabled={isSubmitting} onClick={() => void createOrder()}>
          {isSubmitting ? t('submitting') : t('create')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('list_title')}</h2>
        {listError ? <p className="mt-2 text-sm text-red-600">{listError}</p> : null}
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('order_no')}</TableHead>
                  <TableHead>{t('customer_name')}</TableHead>
                  <TableHead>{t('sku_item_code')}</TableHead>
                  <TableHead>{t('ordered_qty')}</TableHead>
                  <TableHead>{t('unit_price')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('due_date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.orderNo}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.skuItemCode}</TableCell>
                    <TableCell>{row.orderedQty}</TableCell>
                    <TableCell>{row.unitPrice}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.dueDate ? row.dueDate.slice(0, 10) : '—'}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      {t('empty')}
                    </TableCell>
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
