import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function dec(v) {
  return new Prisma.Decimal(v);
}

async function ensureBaseData() {
  const wh = await prisma.warehouse.upsert({
    where: { warehouseCode: 'FG01' },
    update: { name: 'FG Warehouse' },
    create: {
      warehouseCode: 'FG01',
      name: 'FG Warehouse',
      locations: { create: [{ locationCode: 'FG-A01', name: 'FG Area A01', isActive: true }] },
    },
    include: { locations: true },
  });
  const loc = wh.locations[0];

  await prisma.item.upsert({
    where: { itemCode: '900001' },
    update: { itemName: 'Smart Lock Model X', itemType: 'PRODUCT', unit: 'PCS', sourceType: 'MANUFACTURED', isPurchasable: false },
    create: { itemCode: '900001', itemName: 'Smart Lock Model X', itemType: 'PRODUCT', unit: 'PCS', sourceType: 'MANUFACTURED', isPurchasable: false },
  });
  await prisma.item.upsert({
    where: { itemCode: '900101' },
    update: { itemName: 'Mainboard', itemType: 'MATERIAL', unit: 'PCS', sourceType: 'PURCHASED', isPurchasable: true },
    create: { itemCode: '900101', itemName: 'Mainboard', itemType: 'MATERIAL', unit: 'PCS', sourceType: 'PURCHASED', isPurchasable: true },
  });

  const bom = await prisma.bomHeader.upsert({
    where: { parentItemCode_version: { parentItemCode: '900001', version: 'V1' } },
    update: { isActive: true },
    create: { parentItemCode: '900001', version: 'V1', isActive: true, createdBy: 'system' },
  });
  await prisma.bomLine.upsert({
    where: { bomHeaderId_componentItemCode: { bomHeaderId: bom.id, componentItemCode: '900101' } },
    update: { quantity: dec(1) },
    create: { bomHeaderId: bom.id, componentItemCode: '900101', quantity: dec(1) },
  });

  return { locId: loc.id };
}

async function run() {
  const { locId } = await ensureBaseData();
  const orderNo = 'SO-20260408-001';

  const so = await prisma.salesOrder.upsert({
    where: { orderNo },
    update: { customerName: 'SmartLock Dealer CN', skuItemCode: '900001', orderedQty: 100, unitPrice: dec(799), currency: 'CNY', status: 'DRAFT' },
    create: { orderNo, customerName: 'SmartLock Dealer CN', skuItemCode: '900001', orderedQty: 100, unitPrice: dec(799), currency: 'CNY', status: 'DRAFT', dueDate: new Date(Date.now() + 7 * 86400000) },
  });

  // confirm + auto plan mimic
  await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: 'system' } });
  const wo = await prisma.workOrder.upsert({
    where: { workOrderNo: `WO-${orderNo}` },
    update: {},
    create: {
      workOrderNo: `WO-${orderNo}`,
      salesOrderId: so.id,
      skuItemCode: '900001',
      batchNo: 'BL-20260408-001',
      plannedQty: 100,
      status: 'PLANNED',
      createdBy: 'system',
    },
  });
  const supplier = await prisma.supplier.upsert({
    where: { supplierCode: 'AUTO-900101' },
    update: { name: 'Auto Supplier Mainboard' },
    create: { supplierCode: 'AUTO-900101', name: 'Auto Supplier Mainboard' },
  });
  const po = await prisma.purchaseOrder.upsert({
    where: { poNo: `PO-${orderNo}-01` },
    update: {},
    create: {
      poNo: `PO-${orderNo}-01`,
      salesOrderId: so.id,
      supplierId: supplier.id,
      status: 'CONFIRMED',
      currency: 'CNY',
      createdBy: 'system',
      lines: { create: [{ itemCode: '900101', orderedQty: dec(100), unitPrice: dec(120) }] },
    },
    include: { lines: true },
  });

  // receive + IQC
  await prisma.inventoryBalance.upsert({
    where: { itemCode_locationId: { itemCode: '900101', locationId: locId } },
    update: { quantity: dec(100) },
    create: { itemCode: '900101', locationId: locId, quantity: dec(100) },
  });
  await prisma.qualityInspection.create({
    data: {
      inspectionNo: `IQC-${orderNo}`,
      stage: 'IQC',
      result: 'PASS',
      itemCode: '900101',
      sampleSize: 100,
      defectQty: 0,
      inspectedBy: 'qa',
      inspectedAt: new Date(),
    },
  }).catch(() => {});

  // issue materials
  await prisma.inventoryBalance.update({
    where: { itemCode_locationId: { itemCode: '900101', locationId: locId } },
    data: { quantity: dec(0) },
  });
  await prisma.inventoryTxn.create({ data: { txnType: 'OUT', itemCode: '900101', quantity: dec(100), fromLocationId: locId, refType: 'WORK_ORDER', refNo: wo.workOrderNo, operator: 'system' } });
  await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'IN_PROGRESS' } });

  // report + FQC + FG stock
  await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'DONE' } });
  await prisma.qualityInspection.create({
    data: {
      inspectionNo: `FQC-${orderNo}`,
      stage: 'OQC',
      result: 'PASS',
      itemCode: '900001',
      sampleSize: 100,
      defectQty: 0,
      inspectedBy: 'qa',
      inspectedAt: new Date(),
    },
  }).catch(() => {});
  await prisma.inventoryBalance.upsert({
    where: { itemCode_locationId: { itemCode: '900001', locationId: locId } },
    update: { quantity: dec(100) },
    create: { itemCode: '900001', locationId: locId, quantity: dec(100) },
  });

  // ship + invoice + payment
  await prisma.inventoryBalance.update({
    where: { itemCode_locationId: { itemCode: '900001', locationId: locId } },
    data: { quantity: dec(0) },
  });
  await prisma.shipment.create({
    data: { shipmentNo: `SHP-${orderNo}`, salesOrderId: so.id, shippedQty: 100, status: 'POSTED', postedAt: new Date(), warehouseCode: 'FG01', locationId: locId, logisticsNo: 'LGS-1001', createdBy: 'system' },
  }).catch(() => {});
  await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'SHIPPED' } });

  const invoice = await prisma.invoice.upsert({
    where: { invoiceNo: `INV-${orderNo}` },
    update: { status: 'ISSUED', amount: dec(79900), paidAmount: dec(0), currency: 'CNY', salesOrderId: so.id },
    create: { invoiceNo: `INV-${orderNo}`, salesOrderId: so.id, status: 'ISSUED', amount: dec(79900), paidAmount: dec(0), currency: 'CNY' },
  });
  await prisma.payment.create({
    data: { paymentNo: `PAY-${orderNo}`, invoiceId: invoice.id, amount: dec(79900), currency: 'CNY', method: 'BANK_TRANSFER', createdBy: 'finance' },
  }).catch(() => {});
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAmount: dec(79900) } });
  await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'CLOSED' } });

  await prisma.costEntry.createMany({
    data: [
      { workOrderId: wo.id, entryType: 'MATERIAL', amount: dec(12000), currency: 'CNY', sourceType: 'PO', sourceRef: po.poNo, createdBy: 'system' },
      { workOrderId: wo.id, entryType: 'LABOR', amount: dec(200), currency: 'CNY', sourceType: 'REPORT', sourceRef: wo.workOrderNo, createdBy: 'system' },
      { workOrderId: wo.id, entryType: 'OVERHEAD', amount: dec(120), currency: 'CNY', sourceType: 'REPORT', sourceRef: wo.workOrderNo, createdBy: 'system' },
    ],
  });

  const costs = await prisma.costEntry.aggregate({ where: { workOrderId: wo.id }, _sum: { amount: true } });
  const revenue = 79900;
  const totalCost = Number(costs._sum.amount ?? 0);
  const profit = revenue - totalCost;

  console.log(JSON.stringify({
    scenario: orderNo,
    salesOrderStatus: 'CLOSED',
    workOrderNo: wo.workOrderNo,
    purchaseOrderNo: po.poNo,
    iqc: 'PASS',
    fqc: 'PASS',
    shippedQty: 100,
    revenue,
    totalCost,
    profit,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
