'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      await loadData();
    } catch {
      setError(t('save_failed'));
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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('create_po')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input placeholder={t('po_no')} value={poNo} onChange={(e) => setPoNo(e.target.value.toUpperCase())} />
          <Input placeholder={t('supplier_code')} value={supplierCode} onChange={(e) => setSupplierCode(e.target.value.toUpperCase())} />
          <Input placeholder={t('supplier_name')} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <Input placeholder={t('sku_item_code')} value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <Input placeholder={t('ordered_qty')} value={orderedQty} onChange={(e) => setOrderedQty(e.target.value)} />
          <Input placeholder={t('unit_price')} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Input placeholder={t('created_by')} value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
        </div>
        <Button
          className="mt-4"
          disabled={isSubmitting}
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
        >
          {isSubmitting ? t('submitting') : t('create')}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('receive_goods')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select aria-label={t('select_po')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selectedPoId} onChange={(e) => setSelectedPoId(e.target.value)}>
            <option value="">{t('select_po')}</option>
            {rows.map((po) => <option key={po.id} value={po.id}>{po.poNo}</option>)}
          </select>
          <select aria-label={t('select_line')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)}>
            <option value="">{t('select_line')}</option>
            {(selectedPo?.lines ?? []).map((line) => (
              <option key={line.id} value={line.id}>{line.itemCode}</option>
            ))}
          </select>
          <Input placeholder={t('receive_qty')} value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
          <select aria-label={t('select_location')} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">{t('select_location')}</option>
            {warehouses.flatMap((w) =>
              w.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{w.warehouseCode}/{loc.locationCode}</option>
              ))
            )}
          </select>
          <Input placeholder={t('operator')} value={operator} onChange={(e) => setOperator(e.target.value)} />
          <Input placeholder={t('batch_no')} value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            variant="outline"
            disabled={isSubmitting || !selectedPoId}
            onClick={() => void submitAction(`/api/procurement/orders/${selectedPoId}/confirm`, { confirmedBy: operator }, t('confirm_success'))}
          >
            {isSubmitting ? t('submitting') : t('confirm_po')}
          </Button>
          <Button
            disabled={isSubmitting || !selectedPoId || !selectedLineId}
            onClick={() =>
              void submitAction(
                `/api/procurement/orders/${selectedPoId}/receive`,
                { lineId: selectedLineId, locationId, receivedQty: Number.parseFloat(receiveQty), operator, batchNo },
                t('receive_success')
              )
            }
          >
            {isSubmitting ? t('submitting') : t('submit_receive')}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('po_list')}</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('po_no')}</TableHead>
                  <TableHead>{t('supplier_name')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('line_item')}</TableHead>
                  <TableHead>{t('ordered_qty')}</TableHead>
                  <TableHead>{t('received_qty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.poNo}</TableCell>
                    <TableCell>{po.supplier.name}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell>{po.lines[0]?.itemCode ?? '-'}</TableCell>
                    <TableCell>{po.lines[0]?.orderedQty ?? '-'}</TableCell>
                    <TableCell>{po.lines[0]?.receivedQty ?? '-'}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">{t('empty')}</TableCell>
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
