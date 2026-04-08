'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  createdAt: string;
}

export default function InventoryPage() {
  const t = useTranslations('Inventory');
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [locationName, setLocationName] = useState('');

  const [txnType, setTxnType] = useState<TxnType>('IN');
  const [itemCode, setItemCode] = useState('');
  const [qty, setQty] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [operator, setOperator] = useState('');
  const [remarks, setRemarks] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [materialMode, setMaterialMode] = useState<'ISSUE' | 'RETURN'>('ISSUE');

  const locationOptions = useMemo(
    () =>
      warehouses.flatMap((w) =>
        w.locations.map((l) => ({
          id: l.id,
          label: `${w.warehouseCode}/${l.locationCode}${l.name ? ` - ${l.name}` : ''}`,
        }))
      ),
    [warehouses]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [wRes, bRes, tRes] = await Promise.all([
        fetch('/api/inventory/warehouses', { cache: 'no-store' }),
        fetch('/api/inventory/balances', { cache: 'no-store' }),
        fetch('/api/inventory/transactions', { cache: 'no-store' }),
      ]);
      if (!wRes.ok || !bRes.ok || !tRes.ok) {
        setError(t('load_failed'));
        return;
      }
      setWarehouses((await wRes.json()) as WarehouseRow[]);
      setBalances((await bRes.json()) as BalanceRow[]);
      setTxns((await tRes.json()) as TxnRow[]);
    } catch {
      setError(t('load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mapError = (code?: string) => {
    const map: Record<string, string> = {
      WAREHOUSE_CODE_INVALID: 'warehouse_code_invalid',
      WAREHOUSE_NAME_REQUIRED: 'warehouse_name_required',
      LOCATION_CODE_INVALID: 'location_code_invalid',
      WAREHOUSE_CODE_DUPLICATE: 'warehouse_code_duplicate',
      INVENTORY_TXN_TYPE_INVALID: 'txn_type_invalid',
      SKU_ITEM_CODE_INVALID: 'sku_item_code_invalid',
      INVENTORY_QTY_INVALID: 'qty_invalid',
      FROM_LOCATION_REQUIRED: 'from_location_required',
      TO_LOCATION_REQUIRED: 'to_location_required',
      INSUFFICIENT_STOCK: 'insufficient_stock',
      MATERIAL_MODE_INVALID: 'material_mode_invalid',
      LOCATION_REQUIRED: 'location_required',
      WORK_ORDER_NOT_FOUND: 'work_order_not_found',
    };
    return code && map[code] ? t(map[code]) : t('save_failed');
  };

  const createWarehouse = async () => {
    setIsSubmitting(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseCode: warehouseCode.trim(),
          name: warehouseName.trim(),
          locationCode: locationCode.trim(),
          locationName: locationName.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(mapError(payload?.error));
        return;
      }
      setMessage(t('warehouse_create_success'));
      setWarehouseCode('');
      setWarehouseName('');
      setLocationCode('');
      setLocationName('');
      await loadData();
    } catch {
      setError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createTxn = async () => {
    setIsSubmitting(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnType,
          itemCode: itemCode.trim(),
          quantity: qty.trim(),
          fromLocationId,
          toLocationId,
          operator: operator.trim(),
          remarks: remarks.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(mapError(payload?.error));
        return;
      }
      setMessage(t('txn_create_success'));
      setQty('');
      setRemarks('');
      await loadData();
    } catch {
      setError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitWorkOrderMaterial = async () => {
    setIsSubmitting(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/inventory/work-orders/${workOrderId.trim()}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: materialMode,
          itemCode: itemCode.trim(),
          locationId: materialMode === 'ISSUE' ? fromLocationId : toLocationId,
          quantity: qty.trim(),
          operator: operator.trim(),
          remarks: remarks.trim(),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(mapError(payload?.error));
        return;
      }
      setMessage(t('material_txn_success'));
      await loadData();
    } catch {
      setError(t('save_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('warehouse_section')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input placeholder={t('warehouse_code')} value={warehouseCode} onChange={(e) => setWarehouseCode(e.target.value.toUpperCase())} />
          <Input placeholder={t('warehouse_name')} value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
          <Input placeholder={t('location_code')} value={locationCode} onChange={(e) => setLocationCode(e.target.value.toUpperCase())} />
          <Input placeholder={t('location_name_optional')} value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </div>
        <Button type="button" className="mt-3" disabled={isSubmitting} onClick={() => void createWarehouse()}>
          {isSubmitting ? t('submitting') : t('create_warehouse')}
        </Button>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('txn_section')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Select value={txnType} onValueChange={(v) => setTxnType((v || 'IN') as TxnType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IN">IN</SelectItem>
              <SelectItem value="OUT">OUT</SelectItem>
              <SelectItem value="TRANSFER">TRANSFER</SelectItem>
              <SelectItem value="ADJUST">ADJUST</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder={t('sku_item_code')} value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <Input placeholder={t('quantity')} value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder={t('operator_optional')} value={operator} onChange={(e) => setOperator(e.target.value)} />
          <Select value={fromLocationId || undefined} onValueChange={(v) => setFromLocationId(v || '')}>
            <SelectTrigger><SelectValue placeholder={t('from_location')} /></SelectTrigger>
            <SelectContent>
              {locationOptions.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={toLocationId || undefined} onValueChange={(v) => setToLocationId(v || '')}>
            <SelectTrigger><SelectValue placeholder={t('to_location')} /></SelectTrigger>
            <SelectContent>
              {locationOptions.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder={t('remarks_optional')} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <Button type="button" className="mt-3" disabled={isSubmitting} onClick={() => void createTxn()}>
          {isSubmitting ? t('submitting') : t('create_txn')}
        </Button>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('work_order_material_section')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <Input placeholder={t('work_order_id')} value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} />
          <Select value={materialMode} onValueChange={(v) => setMaterialMode((v || 'ISSUE') as 'ISSUE' | 'RETURN')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ISSUE">{t('mode_issue')}</SelectItem>
              <SelectItem value="RETURN">{t('mode_return')}</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder={t('sku_item_code')} value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <Input placeholder={t('quantity')} value={qty} onChange={(e) => setQty(e.target.value)} />
          <Select
            value={(materialMode === 'ISSUE' ? fromLocationId : toLocationId) || undefined}
            onValueChange={(v) => (materialMode === 'ISSUE' ? setFromLocationId(v || '') : setToLocationId(v || ''))}
          >
            <SelectTrigger><SelectValue placeholder={t('location')} /></SelectTrigger>
            <SelectContent>
              {locationOptions.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="mt-3" disabled={isSubmitting} onClick={() => void submitWorkOrderMaterial()}>
          {isSubmitting ? t('submitting') : t('submit_material_txn')}
        </Button>
      </section>

      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('balances')}</h2>
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sku_item_code')}</TableHead>
                <TableHead>{t('item_name')}</TableHead>
                <TableHead>{t('warehouse')}</TableHead>
                <TableHead>{t('location')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.item.itemCode}</TableCell>
                  <TableCell>{row.item.itemName}</TableCell>
                  <TableCell>{row.location.warehouse.warehouseCode}</TableCell>
                  <TableCell>{row.location.locationCode}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('txns')}</h2>
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">{t('loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('txn_type')}</TableHead>
                <TableHead>{t('sku_item_code')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead>{t('reference')}</TableHead>
                <TableHead>{t('time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.txnType}</TableCell>
                  <TableCell>{row.itemCode}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{row.refType && row.refNo ? `${row.refType}:${row.refNo}` : '—'}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
