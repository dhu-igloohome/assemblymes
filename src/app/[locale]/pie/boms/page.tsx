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

interface BomLine {
  componentItemCode: string;
  quantity: number;
  scrapRate: number;
}

export default function BomsPage() {
  const t = useTranslations('Boms');
  const [items, setItems] = useState<Item[]>([]);
  const [parentItemCode, setParentItemCode] = useState('');
  const [version, setVersion] = useState('V1.0');
  const [lines, setLines] = useState<BomLine[]>([]);
  
  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(console.error);
  }, []);

  const loadBom = async (code: string | null) => {
    if (!code) return;
    setParentItemCode(code);
    try {
      const res = await fetch(`/api/boms?parentItemCode=${code}`);
      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
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
  };

  const handleAddLine = () => {
    setLines([...lines, { componentItemCode: '', quantity: 1, scrapRate: 0 }]);
  };

  const updateLine = (index: number, field: keyof BomLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSave = async () => {
    try {
      await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentItemCode, version, lines })
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
        <Button onClick={handleSave} disabled={!parentItemCode}>{t('save')}</Button>
      </div>

      <div className="flex space-x-4 mb-8">
        <div className="w-1/3">
          <Select onValueChange={(v) => loadBom(v ? String(v) : '')} value={parentItemCode}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_parent')} />
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

      {parentItemCode && (
        <div className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">BOM Lines</h2>
            <Button variant="outline" onClick={handleAddLine}>{t('add_component')}</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('component_code')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead>{t('scrap_rate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select 
                      value={line.componentItemCode} 
                      onValueChange={(val) => updateLine(idx, 'componentItemCode', val ? String(val) : '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('component_code')} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.filter(i => i.itemCode !== parentItemCode).map(item => (
                          <SelectItem key={item.itemCode} value={item.itemCode}>
                            {item.itemCode} - {item.itemName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('quantity')}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      placeholder={t('scrap_rate')}
                      value={line.scrapRate}
                      onChange={(e) => updateLine(idx, 'scrapRate', Number(e.target.value))}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                    {t('no_bom')}
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