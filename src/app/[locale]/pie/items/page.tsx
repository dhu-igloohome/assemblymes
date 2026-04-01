'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ItemType = 'PRODUCT' | 'ASSEMBLY' | 'MATERIAL';

interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: ItemType;
  unit: string;
  description: string;
}

export default function ItemsPage() {
  const t = useTranslations('Items');
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    itemType: '',
    unit: '',
    description: ''
  });

  useEffect(() => {
    let active = true;
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/items');
        if (res.ok) {
          const data = await res.json();
          if (active) setItems(data);
        }
      } catch (error) {
        console.error('Failed to load items', error);
      }
    };
    fetchItems();
    return () => { active = false; };
  }, []);

  const fetchItemsDirect = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load items', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitMessage('');

    if (!/^\d{6}$/.test(formData.itemCode)) {
      setSubmitError(t('code_rule_hint'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json().catch(() => null);

      if (res.ok) {
        setIsDialogOpen(false);
        setFormData({ itemCode: '', itemName: '', itemType: '', unit: '', description: '' });
        setSubmitMessage(t('submit_success'));
        fetchItemsDirect();
      } else {
        setSubmitError(result?.error ?? result?.details ?? t('submit_failed'));
      }
    } catch (error) {
      console.error('Failed to create item', error);
      setSubmitError(t('submit_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button>{t('add_item')}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('add_item')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Input
                placeholder={t('item_code')}
                value={formData.itemCode}
                onChange={(e) => setFormData({...formData, itemCode: e.target.value})}
                required
                maxLength={6}
              />
              <p className="text-xs text-gray-500">{t('code_rule_hint')}</p>
              <Input
                placeholder={t('item_name')}
                value={formData.itemName}
                onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                required
              />
              <Select onValueChange={(v) => setFormData({...formData, itemType: v ? String(v) : ''})} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('item_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">{t('type_product')}</SelectItem>
                  <SelectItem value="ASSEMBLY">{t('type_assembly')}</SelectItem>
                  <SelectItem value="MATERIAL">{t('type_material')}</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => setFormData({...formData, unit: v ? String(v) : ''})} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('unit')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={t('description')}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('submitting') : t('add_item')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {submitMessage ? (
        <p className="text-sm text-green-600">{submitMessage}</p>
      ) : null}

      <div className="flex items-center space-x-2 mb-4">
        <Input placeholder={t('search_placeholder')} className="max-w-sm" />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('item_code')}</TableHead>
              <TableHead>{t('item_name')}</TableHead>
              <TableHead>{t('item_type')}</TableHead>
              <TableHead>{t('unit')}</TableHead>
              <TableHead>{t('description')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemCode}</TableCell>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{t(`type_${item.itemType.toLowerCase()}` as Parameters<typeof t>[0])}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.description || '-'}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                  {t('empty_state')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}