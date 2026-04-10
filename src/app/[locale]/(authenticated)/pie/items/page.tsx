'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from '@/i18n/routing';
import {
  DEFAULT_UNIT_BY_TYPE,
  ITEM_GROUP_OPTIONS,
  ITEM_SOURCE_TYPE_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  UNIT_OPTIONS,
} from '@/lib/item-master';
import type { ItemSourceType, ItemStatus, ItemType } from '@/lib/item-master';

interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: ItemType;
  unit: string;
  itemGroup: string | null;
  specification: string | null;
  status: ItemStatus;
  sourceType: ItemSourceType;
  isPurchasable: boolean;
  requiresFlashing: boolean;
  requiresTraceability: boolean;
  requiresDfu: boolean;
  safetyStock: string;
  imageUrl: string | null;
  drawing2dUrl: string | null;
  drawing3dUrl: string | null;
  description: string | null;
  remarks: string | null;
  usage: {
    bomParentCount: number;
    bomComponentCount: number;
    routingCount: number;
    totalReferences: number;
    canDisable: boolean;
    canDelete: boolean;
  };
}

type ItemReferenceDetails = {
  itemCode: string;
  bomParents: Array<{
    id: string;
    version: string;
    isActive: boolean;
    parentItemCode: string;
    parentItem: {
      itemName: string;
    };
  }>;
  bomComponents: Array<{
    id: string;
    quantity: string;
    scrapRate: string;
    bomHeader: {
      id: string;
      version: string;
      isActive: boolean;
      parentItemCode: string;
      parentItem: {
        itemName: string;
      };
    };
  }>;
  routings: Array<{
    id: string;
    version: string;
    itemCode: string;
    item: {
      itemName: string;
    };
    operations: Array<{
      id: string;
      sequence: number;
      operationName: string;
      workstation: string;
      isInspectionPoint?: boolean;
      inspectionStandard?: string | null;
    }>;
  }>;
};

type DialogMode = 'create' | 'edit' | 'copy';

type FilterState = {
  keyword: string;
  itemType: 'ALL' | ItemType;
  status: 'ALL' | ItemStatus;
  sourceType: 'ALL' | ItemSourceType;
};

async function parseApiError(response: Response, fallbackMessage: string) {
  const responseText = await response.text();

  if (!responseText) {
    return `${fallbackMessage} (HTTP ${response.status})`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: string;
      details?: string;
    };

    return (
      parsed.details ??
      parsed.error ??
      `${fallbackMessage} (HTTP ${response.status})`
    );
  } catch {
    return `${fallbackMessage} (HTTP ${response.status}): ${responseText.slice(0, 300)}`;
  }
}

function createItemSchema(t: ReturnType<typeof useTranslations<'Items'>>) {
  return z.object({
    itemCode: z.string().regex(/^\d{6}$/, t('code_rule_hint')),
    itemName: z.string().min(1, t('item_name_required')),
    itemType: z.enum(ITEM_TYPE_OPTIONS),
    unit: z.enum(UNIT_OPTIONS),
    itemGroup: z.enum(ITEM_GROUP_OPTIONS).optional(),
    specification: z.string().optional(),
    status: z.enum(ITEM_STATUS_OPTIONS),
    sourceType: z.enum(ITEM_SOURCE_TYPE_OPTIONS),
    isPurchasable: z.boolean(),
    requiresFlashing: z.boolean(),
    requiresTraceability: z.boolean(),
    requiresDfu: z.boolean(),
    safetyStock: z
      .string()
      .refine((value) => value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0, {
        message: t('safety_stock_invalid'),
      }),
    imageUrl: z.string().optional(),
    drawing2dUrl: z.string().optional(),
    drawing3dUrl: z.string().optional(),
    description: z.string().optional(),
    remarks: z.string().optional(),
  });
}

export default function ItemsPage() {
  const t = useTranslations('Items');
  const locale = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [editingItemCode, setEditingItemCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [codeStatusMessage, setCodeStatusMessage] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    itemType: 'ALL',
    status: 'ALL',
    sourceType: 'ALL',
  });
  const [referenceItem, setReferenceItem] = useState<Item | null>(null);
  const [referenceDetails, setReferenceDetails] = useState<ItemReferenceDetails | null>(null);
  const [referenceError, setReferenceError] = useState('');
  const [isReferenceDialogOpen, setIsReferenceDialogOpen] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const submitModeRef = useRef<'close' | 'continue'>('close');
  const autoCodeRef = useRef(true);
  const schema = useMemo(() => createItemSchema(t), [t]);
  type ItemFormValues = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemCode: '',
      itemName: '',
      itemType: 'PRODUCT',
      unit: 'PCS',
      itemGroup: 'GENERAL',
      specification: '',
      status: 'ENABLED',
      sourceType: 'PURCHASED',
      isPurchasable: true,
      requiresFlashing: false,
      requiresTraceability: false,
      requiresDfu: false,
      safetyStock: '0',
      imageUrl: '',
      drawing2dUrl: '',
      drawing3dUrl: '',
      description: '',
      remarks: '',
    },
  });
  const watchedItemCode = watch('itemCode');
  const watchedItemType = watch('itemType');
  const watchedUnit = watch('unit');
  const watchedStatus = watch('status');
  const watchedSourceType = watch('sourceType');
  const watchedItemGroup = watch('itemGroup');
  const watchedIsPurchasable = watch('isPurchasable');
  const watchedRequiresFlashing = watch('requiresFlashing');
  const watchedRequiresTraceability = watch('requiresTraceability');
  const watchedRequiresDfu = watch('requiresDfu');
  const isEditing = dialogMode === 'edit';
  const hasCodeConflict =
    codeStatus === 'duplicate' &&
    !(isEditing && watchedItemCode === editingItemCode);
  const boolBadgeClass = (v: boolean) =>
    v
      ? 'inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-tighter'
      : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-tighter';

  const [labelPreviewItem, setLabelPreviewItem] = useState<Item | null>(null);

  const fetchItemsDirect = useCallback(async (active = true) => {
    try {
      const searchParams = new URLSearchParams();
      if (filters.keyword.trim()) {
        searchParams.set('keyword', filters.keyword.trim());
      }
      if (filters.itemType !== 'ALL') {
        searchParams.set('itemType', filters.itemType);
      }
      if (filters.status !== 'ALL') {
        searchParams.set('status', filters.status);
      }
      if (filters.sourceType !== 'ALL') {
        searchParams.set('sourceType', filters.sourceType);
      }
      const query = searchParams.toString();
      const res = await fetch(`/api/items${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (active) {
          setItems(data);
        }
      } else if (active) {
        setSubmitError(await parseApiError(res, t('submit_failed')));
      }
    } catch (error) {
      console.error('Failed to load items', error);
      if (active) {
        setSubmitError(
          error instanceof Error
            ? `${t('submit_failed')}: ${error.message}`
            : t('submit_failed')
        );
      }
    }
  }, [filters, t]);

  useEffect(() => {
    let active = true;
    void fetchItemsDirect(active);
    return () => {
      active = false;
    };
  }, [fetchItemsDirect]);

  useEffect(() => {
    let cancelled = false;

    async function syncSuggestedItemCode() {
      if (!watchedItemType || !autoCodeRef.current || isEditing) {
        return;
      }

      try {
        const response = await fetch(
          `/api/items/next-code?itemType=${watchedItemType}`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled && data.nextCode) {
          setValue('itemCode', data.nextCode, { shouldValidate: true });
          setCodeStatus('idle');
          setCodeStatusMessage(t('code_auto_generated'));
        }
      } catch (error) {
        if (!cancelled) {
          setCodeStatus('idle');
          setCodeStatusMessage(
            error instanceof Error ? error.message : t('submit_failed')
          );
        }
      }
    }

    setValue('unit', DEFAULT_UNIT_BY_TYPE[watchedItemType], {
      shouldValidate: true,
    });
    void syncSuggestedItemCode();

    return () => {
      cancelled = true;
    };
  }, [isEditing, setValue, t, watchedItemType]);

  useEffect(() => {
    if (isEditing && watchedItemCode === editingItemCode) {
      setCodeStatus('available');
      setCodeStatusMessage(t('code_current_record'));
      return;
    }

    if (!/^\d{6}$/.test(watchedItemCode ?? '')) {
      setCodeStatus('idle');
      setCodeStatusMessage(t('code_rule_hint'));
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setCodeStatus('checking');
      setCodeStatusMessage(t('checking_code'));

      try {
        const response = await fetch(
          `/api/items/check-code?itemCode=${watchedItemCode}`,
          { cache: 'no-store' }
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setCodeStatus('idle');
          setCodeStatusMessage(
            payload?.details ?? payload?.error ?? t('code_check_failed')
          );
          return;
        }

        if (payload?.available) {
          setCodeStatus('available');
          setCodeStatusMessage(t('code_available'));
        } else {
          setCodeStatus('duplicate');
          setCodeStatusMessage(t('code_duplicate'));
        }
      } catch (error) {
        setCodeStatus('idle');
        setCodeStatusMessage(
          error instanceof Error ? error.message : t('code_check_failed')
        );
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [editingItemCode, isEditing, t, watchedItemCode]);

  const resetFormForCreate = (itemType: ItemType = 'PRODUCT') => {
    reset({
      itemCode: '',
      itemName: '',
      itemType,
      unit: DEFAULT_UNIT_BY_TYPE[itemType],
      itemGroup: 'GENERAL',
      specification: '',
      status: 'ENABLED',
      sourceType: itemType === 'MATERIAL' ? 'PURCHASED' : 'MANUFACTURED',
      isPurchasable: true,
      requiresFlashing: false,
      requiresTraceability: false,
      requiresDfu: false,
      safetyStock: '0',
      imageUrl: '',
      drawing2dUrl: '',
      drawing3dUrl: '',
      description: '',
      remarks: '',
    });
    autoCodeRef.current = true;
    setCodeStatus('idle');
    setCodeStatusMessage(t('code_auto_generating'));
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingItemCode('');
    resetFormForCreate();
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: Item) => {
    setDialogMode('edit');
    setEditingItemCode(item.itemCode);
    reset({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType,
      unit: (item.unit as ItemFormValues['unit']) ?? 'PCS',
      itemGroup: (item.itemGroup as ItemFormValues['itemGroup']) ?? 'GENERAL',
      specification: item.specification ?? '',
      status: item.status,
      sourceType: item.sourceType,
      isPurchasable: item.isPurchasable,
      requiresFlashing: item.requiresFlashing,
      requiresTraceability: item.requiresTraceability,
      requiresDfu: item.requiresDfu,
      safetyStock: item.safetyStock ?? '0',
      imageUrl: item.imageUrl ?? '',
      drawing2dUrl: item.drawing2dUrl ?? '',
      drawing3dUrl: item.drawing3dUrl ?? '',
      description: item.description ?? '',
      remarks: item.remarks ?? '',
    });
    autoCodeRef.current = false;
    setCodeStatus('available');
    setCodeStatusMessage(t('code_current_record'));
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const openCopyDialog = (item: Item) => {
    setDialogMode('copy');
    setEditingItemCode('');
    reset({
      itemCode: '',
      itemName: `${item.itemName} ${t('copy_suffix')}`,
      itemType: item.itemType,
      unit: (item.unit as ItemFormValues['unit']) ?? DEFAULT_UNIT_BY_TYPE[item.itemType],
      itemGroup: (item.itemGroup as ItemFormValues['itemGroup']) ?? 'GENERAL',
      specification: item.specification ?? '',
      status: item.status,
      sourceType: item.sourceType,
      isPurchasable: item.isPurchasable,
      requiresFlashing: item.requiresFlashing,
      requiresTraceability: item.requiresTraceability,
      requiresDfu: item.requiresDfu,
      safetyStock: item.safetyStock ?? '0',
      imageUrl: item.imageUrl ?? '',
      drawing2dUrl: item.drawing2dUrl ?? '',
      drawing3dUrl: item.drawing3dUrl ?? '',
      description: item.description ?? '',
      remarks: item.remarks ?? '',
    });
    autoCodeRef.current = true;
    setCodeStatus('idle');
    setCodeStatusMessage(t('code_auto_generating'));
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async (item: Item) => {
    setSubmitError('');
    setSubmitMessage('');
    try {
      const res = await fetch(`/api/items?itemCode=${item.itemCode}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setSubmitError(await parseApiError(res, t('delete_failed')));
        return;
      }

      setSubmitMessage(t('delete_success'));
      await fetchItemsDirect();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `${t('delete_failed')}: ${error.message}`
          : t('delete_failed')
      );
    }
  };

  const openReferenceDialog = async (item: Item) => {
    setReferenceItem(item);
    setReferenceDetails(null);
    setReferenceError('');
    setIsReferenceDialogOpen(true);
    setIsLoadingReferences(true);

    try {
      const res = await fetch(`/api/items/references?itemCode=${item.itemCode}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        setReferenceError(await parseApiError(res, t('reference_load_failed')));
        return;
      }

      const data = (await res.json()) as ItemReferenceDetails;
      setReferenceDetails(data);
    } catch (error) {
      setReferenceError(
        error instanceof Error
          ? `${t('reference_load_failed')}: ${error.message}`
          : t('reference_load_failed')
      );
    } finally {
      setIsLoadingReferences(false);
    }
  };

  const submitItem = async (values: ItemFormValues) => {
    setSubmitError('');
    setSubmitMessage('');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/items', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          itemGroup: values.itemGroup ?? '',
          safetyStock: values.safetyStock.trim(),
        }),
      });

      if (res.ok) {
        setSubmitMessage(isEditing ? t('update_success') : t('submit_success'));
        await fetchItemsDirect();

        if (!isEditing && submitModeRef.current === 'continue') {
          reset({
            itemCode: '',
            itemName: '',
            itemType: values.itemType,
            unit: DEFAULT_UNIT_BY_TYPE[values.itemType],
            itemGroup: values.itemGroup,
            specification: values.specification,
            status: values.status,
            sourceType: values.sourceType,
            isPurchasable: values.isPurchasable,
            requiresFlashing: values.requiresFlashing,
            requiresTraceability: values.requiresTraceability,
            requiresDfu: values.requiresDfu,
            safetyStock: values.safetyStock,
            imageUrl: values.imageUrl,
            drawing2dUrl: values.drawing2dUrl,
            drawing3dUrl: values.drawing3dUrl,
            description: '',
            remarks: values.remarks,
          });
          autoCodeRef.current = true;
          setCodeStatus('idle');
          setCodeStatusMessage(t('code_auto_generating'));
        } else {
          setIsDialogOpen(false);
          setEditingItemCode('');
          resetFormForCreate();
        }
      } else {
        setSubmitError(await parseApiError(res, t('submit_failed')));
      }
    } catch (error) {
      console.error('Failed to create item', error);
      setSubmitError(
        error instanceof Error
          ? `${t('submit_failed')}: ${error.message}`
          : t('submit_failed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSubmitError('');
            }
          }}
        >
          <DialogTrigger render={<Button onClick={openCreateDialog}>{t('add_item')}</Button>} />
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'edit'
                  ? t('edit_item')
                  : dialogMode === 'copy'
                    ? t('copy_item')
                    : t('add_item')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(submitItem)} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Input
                    placeholder={t('item_code')}
                    value={watchedItemCode}
                    maxLength={6}
                    disabled={isEditing}
                    onChange={(event) => {
                      autoCodeRef.current = false;
                      setValue('itemCode', event.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                  <p
                    className={[
                      'text-xs',
                      hasCodeConflict
                        ? 'text-red-600'
                        : codeStatus === 'available'
                          ? 'text-green-600'
                          : 'text-gray-500',
                    ].join(' ')}
                  >
                    {errors.itemCode?.message ??
                      codeStatusMessage ??
                      t('code_auto_generating')}
                  </p>
                </div>
                <div className="space-y-2">
                  <datalist id="item-master-name-options">
                    {items
                      .map((item) => item.itemName?.trim())
                      .filter((v): v is string => Boolean(v))
                      .slice(0, 200)
                      .map((name) => (
                        <option key={name} value={name} />
                      ))}
                  </datalist>
                  <Input placeholder={t('item_name')} list="item-master-name-options" {...register('itemName')} />
                  {errors.itemName?.message ? (
                    <p className="text-xs text-red-600">{errors.itemName.message}</p>
                  ) : null}
                </div>
                <Select
                  value={watchedItemType}
                  onValueChange={(value) => {
                    const nextType = (value ? String(value) : 'PRODUCT') as ItemType;
                    autoCodeRef.current = !isEditing;
                    setValue('itemType', nextType, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setValue(
                      'sourceType',
                      nextType === 'MATERIAL' ? 'PURCHASED' : 'MANUFACTURED',
                      { shouldValidate: true }
                    );
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('item_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">{t('type_product')}</SelectItem>
                    <SelectItem value="ASSEMBLY">{t('type_assembly')}</SelectItem>
                    <SelectItem value="MATERIAL">{t('type_material')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedUnit}
                  onValueChange={(value) =>
                    setValue('unit', (value ? String(value) : 'PCS') as ItemFormValues['unit'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('unit')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">PCS</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedItemGroup ?? 'GENERAL'}
                  onValueChange={(value) =>
                    setValue('itemGroup', (value ? String(value) : 'GENERAL') as ItemFormValues['itemGroup'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('item_group')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">{t('group_general')}</SelectItem>
                    <SelectItem value="ELECTRONIC">{t('group_electronic')}</SelectItem>
                    <SelectItem value="STRUCTURAL">{t('group_structural')}</SelectItem>
                    <SelectItem value="PACKAGING">{t('group_packaging')}</SelectItem>
                  </SelectContent>
                </Select>
                <datalist id="item-master-spec-options">
                  {items
                    .map((item) => item.specification?.trim())
                    .filter((v): v is string => Boolean(v))
                    .slice(0, 200)
                    .map((spec) => (
                      <option key={spec} value={spec} />
                    ))}
                </datalist>
                <Input placeholder={t('specification')} list="item-master-spec-options" {...register('specification')} />
                <Select
                  value={watchedStatus}
                  onValueChange={(value) =>
                    setValue('status', (value ? String(value) : 'ENABLED') as ItemStatus, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {watchedStatus === 'ENABLED'
                        ? `${t('status')}: ${t('status_enabled')}`
                        : `${t('status')}: ${t('status_disabled')}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENABLED">{t('status_enabled')}</SelectItem>
                    <SelectItem value="DISABLED">{t('status_disabled')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedSourceType}
                  onValueChange={(value) =>
                    setValue('sourceType', (value ? String(value) : 'PURCHASED') as ItemSourceType, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('source_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASED">{t('source_purchased')}</SelectItem>
                    <SelectItem value="MANUFACTURED">{t('source_manufactured')}</SelectItem>
                    <SelectItem value="OUTSOURCED">{t('source_outsourced')}</SelectItem>
                    <SelectItem value="VIRTUAL">{t('source_virtual')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedIsPurchasable ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setValue('isPurchasable', value === 'true', {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {watchedIsPurchasable
                        ? `${t('is_purchasable')}: ${t('yes')}`
                        : `${t('is_purchasable')}: ${t('no')}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedRequiresFlashing ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setValue('requiresFlashing', value === 'true', {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {watchedRequiresFlashing
                        ? `${t('requires_flashing')}: ${t('yes')}`
                        : `${t('requires_flashing')}: ${t('no')}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedRequiresTraceability ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setValue('requiresTraceability', value === 'true', {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {watchedRequiresTraceability
                        ? `${t('requires_traceability')}: ${t('yes')}`
                        : `${t('requires_traceability')}: ${t('no')}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={watchedRequiresDfu ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setValue('requiresDfu', value === 'true', {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {watchedRequiresDfu
                        ? `${t('requires_dfu')}: ${t('yes')}`
                        : `${t('requires_dfu')}: ${t('no')}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {t('safety_stock')}
                    </span>
                    <Input
                      placeholder=""
                      className="pl-28"
                      {...register('safetyStock')}
                      inputMode="decimal"
                    />
                  </div>
                  {errors.safetyStock?.message ? (
                    <p className="text-xs text-red-600">{errors.safetyStock.message}</p>
                  ) : null}
                </div>
                <Input placeholder={t('image_url')} {...register('imageUrl')} />
                <Input placeholder={t('drawing_2d_url')} {...register('drawing2dUrl')} />
                <Input placeholder={t('drawing_3d_url')} {...register('drawing3dUrl')} />
                <Input placeholder={t('description')} {...register('description')} />
                <datalist id="item-master-remarks-options">
                  {items
                    .map((item) => item.remarks?.trim())
                    .filter((v): v is string => Boolean(v))
                    .slice(0, 200)
                    .map((remark) => (
                      <option key={remark} value={remark} />
                    ))}
                </datalist>
                <Input placeholder={t('remarks')} list="item-master-remarks-options" {...register('remarks')} />
              </div>
              <p className="text-xs text-gray-500">{t('unit_auto_default')}</p>
              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || hasCodeConflict || codeStatus === 'checking'}
                  onClick={() => {
                    submitModeRef.current = 'close';
                  }}
                >
                  {isSubmitting
                    ? t('submitting')
                    : isEditing
                      ? t('save_changes')
                      : t('save_and_close')}
                </Button>
                {!isEditing ? (
                  <Button
                    type="submit"
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting || hasCodeConflict || codeStatus === 'checking'}
                    onClick={() => {
                      submitModeRef.current = 'continue';
                    }}
                  >
                    {isSubmitting ? t('submitting') : t('save_and_continue')}
                  </Button>
                ) : null}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {submitMessage ? (
        <p className="text-sm text-green-600">{submitMessage}</p>
      ) : null}

      <Dialog open={isReferenceDialogOpen} onOpenChange={setIsReferenceDialogOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {referenceItem
                ? t('reference_details_title', {
                    itemCode: referenceItem.itemCode,
                    itemName: referenceItem.itemName,
                  })
                : t('reference_details')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {isLoadingReferences ? (
              <p className="text-gray-500">{t('reference_loading')}</p>
            ) : null}
            {referenceError ? (
              <p className="text-red-600">{referenceError}</p>
            ) : null}
            {!isLoadingReferences && !referenceError && referenceDetails ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h3 className="font-medium text-gray-900">{t('reference_bom_parent_section')}</h3>
                  <div className="mt-2 space-y-2 text-xs text-gray-700">
                    {referenceDetails.bomParents.length === 0 ? (
                      <p>{t('reference_none')}</p>
                    ) : (
                      referenceDetails.bomParents.map((entry) => (
                        <div key={entry.id} className="rounded border p-2">
                          <div>{`${entry.parentItemCode} / ${entry.parentItem.itemName}`}</div>
                          <div>{`${t('version_label')}: ${entry.version}`}</div>
                          <div>{`${t('current_version_label')}: ${entry.isActive ? t('yes') : t('no')}`}</div>
                          <div className="mt-2">
                            <Link
                              href={{
                                pathname: '/pie/boms',
                                query: { parentItemCode: entry.parentItemCode },
                              }}
                              locale={locale}
                              className="text-blue-600 underline"
                            >
                              {t('go_to_bom')}
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h3 className="font-medium text-gray-900">{t('reference_bom_component_section')}</h3>
                  <div className="mt-2 space-y-2 text-xs text-gray-700">
                    {referenceDetails.bomComponents.length === 0 ? (
                      <p>{t('reference_none')}</p>
                    ) : (
                      referenceDetails.bomComponents.map((entry) => (
                        <div key={entry.id} className="rounded border p-2">
                          <div>{`${entry.bomHeader.parentItemCode} / ${entry.bomHeader.parentItem.itemName}`}</div>
                          <div>{`${t('version_label')}: ${entry.bomHeader.version}`}</div>
                          <div>{`${t('quantity_label')}: ${entry.quantity}`}</div>
                          <div>{`${t('scrap_rate_label')}: ${entry.scrapRate}`}</div>
                          <div className="mt-2">
                            <Link
                              href={{
                                pathname: '/pie/boms',
                                query: { parentItemCode: entry.bomHeader.parentItemCode },
                              }}
                              locale={locale}
                              className="text-blue-600 underline"
                            >
                              {t('go_to_bom')}
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h3 className="font-medium text-gray-900">{t('reference_routing_section')}</h3>
                  <div className="mt-2 space-y-2 text-xs text-gray-700">
                    {referenceDetails.routings.length === 0 ? (
                      <p>{t('reference_none')}</p>
                    ) : (
                      referenceDetails.routings.map((entry) => (
                        <div key={entry.id} className="rounded border p-2">
                          <div>{`${entry.itemCode} / ${entry.item.itemName}`}</div>
                          <div>{`${t('version_label')}: ${entry.version}`}</div>
                          <div>
                            {entry.operations.map((operation) => (
                              <div key={operation.id}>
                                            {`${operation.sequence} - ${operation.operationName} / ${operation.workstation}${
                                              operation.isInspectionPoint ? ' [QC]' : ''
                                            }`}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <Link
                              href={{
                                pathname: '/pie/routings',
                                query: { itemCode: entry.itemCode },
                              }}
                              locale={locale}
                              className="text-blue-600 underline"
                            >
                              {t('go_to_routing')}
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4 md:grid-cols-4">
        <Input
          placeholder={t('search_placeholder')}
          value={filters.keyword}
          onChange={(event) =>
            setFilters((current) => ({ ...current, keyword: event.target.value }))
          }
        />
        <Select
          value={filters.itemType}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              itemType: (value ? String(value) : 'ALL') as FilterState['itemType'],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('filter_item_type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all_types')}</SelectItem>
            <SelectItem value="PRODUCT">{t('type_product')}</SelectItem>
            <SelectItem value="ASSEMBLY">{t('type_assembly')}</SelectItem>
            <SelectItem value="MATERIAL">{t('type_material')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: (value ? String(value) : 'ALL') as FilterState['status'],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('filter_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all_statuses')}</SelectItem>
            <SelectItem value="ENABLED">{t('status_enabled')}</SelectItem>
            <SelectItem value="DISABLED">{t('status_disabled')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.sourceType}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              sourceType: (value ? String(value) : 'ALL') as FilterState['sourceType'],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('filter_source_type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all_source_types')}</SelectItem>
            <SelectItem value="PURCHASED">{t('source_purchased')}</SelectItem>
            <SelectItem value="MANUFACTURED">{t('source_manufactured')}</SelectItem>
            <SelectItem value="OUTSOURCED">{t('source_outsourced')}</SelectItem>
            <SelectItem value="VIRTUAL">{t('source_virtual')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[80px]">预览</TableHead>
              <TableHead>{t('item_code')}</TableHead>
              <TableHead className="min-w-[200px]">{t('item_name')}</TableHead>
              <TableHead>{t('item_type')}</TableHead>
              <TableHead>核心配置</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('unit')}</TableHead>
              <TableHead>{t('safety_stock')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="size-12 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="object-cover size-full" />
                    ) : (
                      <Package className="size-5 text-slate-300" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono font-bold text-slate-900">{item.itemCode}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{item.itemName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{item.specification || '-'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    item.itemType === 'PRODUCT' ? 'bg-purple-100 text-purple-700' : 
                    item.itemType === 'ASSEMBLY' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t(`type_${item.itemType.toLowerCase()}` as any)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.requiresFlashing && <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold">烧录</span>}
                    {item.requiresTraceability && <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-bold">追溯</span>}
                    {item.isPurchasable && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">外购</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`size-2 inline-block rounded-full mr-2 ${item.status === 'ENABLED' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <span className="text-xs font-medium text-slate-600">{t(`status_${item.status.toLowerCase()}` as any)}</span>
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-500">{item.unit}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-900">{item.safetyStock}</span>
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 w-1/3" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => setLabelPreviewItem(item)}>
                      <Scan className="size-3.5 text-slate-400 hover:text-indigo-600" />
                    </Button>
                    <Button size="xs" variant="outline" className="font-bold h-7" onClick={() => openEditDialog(item)}>
                      {t('edit')}
                    </Button>
                    <Button size="xs" variant="secondary" className="h-7" onClick={() => void openReferenceDialog(item)}>
                      引用
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} className="py-6 text-center text-gray-500">
                  {t('empty_state')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 物料标签预览 - 小厂落地的“最后一公里” */}
      <Dialog open={!!labelPreviewItem} onOpenChange={(open) => !open && setLabelPreviewItem(null)}>
        <DialogContent className="sm:max-w-xs p-6 flex flex-col items-center gap-4">
          <div className="border-2 border-slate-900 p-4 rounded-lg w-full bg-white flex flex-col items-center">
            <h3 className="font-black text-xl mb-1">{labelPreviewItem?.itemCode}</h3>
            <p className="text-sm font-bold text-slate-700 mb-4">{labelPreviewItem?.itemName}</p>
            <div className="size-32 bg-slate-100 rounded flex items-center justify-center border-2 border-slate-900">
              <Scan className="size-16 text-slate-900" />
            </div>
            <p className="text-[10px] text-slate-400 mt-4 uppercase">Generated by Assembly MES</p>
          </div>
          <Button className="w-full bg-slate-900 text-white font-bold" onClick={() => window.print()}>
            打印此标签
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
