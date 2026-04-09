import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 1: Setup Master Data ---');

  // 1. Create Item IGB4E
  const igb4e = await prisma.item.upsert({
    where: { itemCode: 'IGB4E1' }, // Using a unique code
    update: {},
    create: {
      itemCode: 'IGB4E1',
      itemName: 'Smart Lock IGB4E',
      itemType: 'PRODUCT',
      unit: 'PCS',
      sourceType: 'MANUFACTURED',
      specification: '1.3kg, 100x150x40mm, HS 830140',
      requiresTraceability: true,
    },
  });
  console.log('Item created:', igb4e.itemCode);

  // 2. Create Components
  const components = [
    { code: 'M83011', name: 'Lock Body', type: 'MATERIAL' },
    { code: 'M83012', name: 'PCB Assembly', type: 'MATERIAL' },
    { code: 'M83013', name: 'Battery Pack', type: 'MATERIAL' },
    { code: 'M83014', name: 'Screw Set', type: 'MATERIAL' },
    { code: 'M83015', name: 'Front Panel', type: 'MATERIAL' },
  ];

  for (const comp of components) {
    await prisma.item.upsert({
      where: { itemCode: comp.code },
      update: {},
      create: {
        itemCode: comp.code,
        itemName: comp.name,
        itemType: comp.type,
        unit: 'PCS',
        sourceType: 'PURCHASED',
      },
    });
  }
  console.log('Components created.');

  // 3. Create BOM
  const bom = await prisma.bomHeader.upsert({
    where: { parentItemCode_version: { parentItemCode: 'IGB4E1', version: 'V1' } },
    update: { isActive: true },
    create: {
      parentItemCode: 'IGB4E1',
      version: 'V1',
      isActive: true,
      lines: {
        create: components.map((c) => ({
          componentItemCode: c.code,
          quantity: 1.0,
        })),
      },
    },
  });
  console.log('BOM created.');

  // 4. Create Routing
  await prisma.routingHeader.upsert({
    where: { itemCode_version: { itemCode: 'IGB4E1', version: 'V1' } },
    update: {},
    create: {
      itemCode: 'IGB4E1',
      version: 'V1',
      operations: {
        create: [
          { sequence: 10, operationName: '备料 (Kitting)', workstation: 'WH-PREP', standardTimeSec: 60 },
          { sequence: 20, operationName: '组装 (Assembly)', workstation: 'ASSY-01', standardTimeSec: 300 },
          { sequence: 30, operationName: '测试 (Testing)', workstation: 'TEST-01', standardTimeSec: 120, isInspectionPoint: true },
          { sequence: 40, operationName: '包装 (Packing)', workstation: 'PACK-01', standardTimeSec: 60 },
        ],
      },
    },
  });
  console.log('Routing created.');

  // 5. Create Suppliers
  const suppliers = ['A', 'B', 'C', 'D'];
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierCode: `SUP-${s}` },
      update: {},
      create: {
        supplierCode: `SUP-${s}`,
        name: `Virtual Supplier ${s}`,
      },
    });
  }
  console.log('Suppliers created.');

  // 6. Create Warehouse & Locations
  const szWh = await prisma.warehouse.upsert({
    where: { warehouseCode: 'SZ-FACTORY' },
    update: {},
    create: {
      warehouseCode: 'SZ-FACTORY',
      name: 'Shenzhen Factory Warehouse',
    },
  });

  const locations = ['RAW-MAT', 'FG-STORE', 'QC-ZONE'];
  for (const loc of locations) {
    await prisma.storageLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId: szWh.id, locationCode: loc } },
      update: {},
      create: {
        warehouseId: szWh.id,
        locationCode: loc,
        name: `SZ ${loc} Location`,
      },
    });
  }
  console.log('Warehouse & Locations created.');

  // 7. Create Work Centers (to match Routing)
  const wcs = ['WH-PREP', 'ASSY-01', 'TEST-01', 'PACK-01'];
  for (const wc of wcs) {
    await prisma.workCenter.upsert({
      where: { workCenterCode: wc },
      update: {},
      create: {
        workCenterCode: wc,
        name: `${wc} Work Center`,
        type: 'STANDALONE',
      },
    });
  }
  console.log('Work Centers created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
