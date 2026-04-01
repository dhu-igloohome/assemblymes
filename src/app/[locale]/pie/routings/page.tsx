'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Item {
  itemCode: string;
  itemName: string;
}

interface OperationLine {
  sequence: number;
  operationName: string;
  workstation: string;
  standardTimeSec: number;
}

export default function RoutingsPage() {
  const t = useTranslations('Routings');
  const [items, setItems] = useState<Item[]>([]);
  const [itemCode, setItemCode] = useState('');
  const [version, setVersion] = useState('V1.0');
  const [operations, setOperations] = useState<OperationLine[]>([]);
  
  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(console.error);
  }, []);

  const loadRouting = async (code: string | null) => {
    if (!code) return;
    setItemCode(code);
    try {
      const res = await fetch(`/api/routings?itemCode=${code}`);
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        setOperations(data.operations.map((o: { sequence: number, operationName: string, workstation: string, standardTimeSec: number }) => ({
          sequence: o.sequence,
          operationName: o.operationName,
          workstation: o.workstation,
          standardTimeSec: o.standardTimeSec
        })));
      } else {
        setOperations([]);
      }
    } catch (error) {
      console.error(error);
      setOperations([]);
    }
  };

  const handleAddOperation = () => {
    setOperations([
      ...operations, 
      { sequence: (operations.length + 1) * 10, operationName: '', workstation: '', standardTimeSec: 60 }
    ]);
  };

  const updateOperation = (index: number, field: keyof OperationLine, value: string | number) => {
    const newOps = [...operations];
    newOps[index] = { ...newOps[index], [field]: value };
    setOperations(newOps);
  };

  const handleSave = async () => {
    try {
      await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCode, version, operations })
      });
      alert('Saved!');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Button onClick={handleSave} disabled={!itemCode}>{t('save')}</Button>
      </div>

      <div className="flex space-x-4 mb-8">
        <div className="w-1/3">
          <Select onValueChange={(v) => loadRouting(v ? String(v) : '')} value={itemCode}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_item')} />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.itemCode} value={item.itemCode}>
                  {item.itemCode} - {item.itemName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/3">
          <Input 
            placeholder={t('version')} 
            value={version} 
            onChange={(e) => setVersion(e.target.value)} 
          />
        </div>
      </div>

      {itemCode && (
        <div className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Operations</h2>
            <Button variant="outline" onClick={handleAddOperation}>{t('add_operation')}</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sequence')}</TableHead>
                <TableHead>{t('operation_name')}</TableHead>
                <TableHead>{t('workstation')}</TableHead>
                <TableHead>{t('standard_time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('sequence')}
                      value={op.sequence}
                      onChange={(e) => updateOperation(idx, 'sequence', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder={t('operation_name')}
                      value={op.operationName}
                      onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder={t('workstation')}
                      value={op.workstation}
                      onChange={(e) => updateOperation(idx, 'workstation', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('standard_time')}
                      value={op.standardTimeSec}
                      onChange={(e) => updateOperation(idx, 'standardTimeSec', Number(e.target.value))}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {operations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    {t('no_routing')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}