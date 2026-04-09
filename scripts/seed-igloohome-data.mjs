import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding igloohome data...');

  // 1. Create Work Centers
  const workCenters = [
    { code: 'WC-PCBA-TEST', name: 'PCBA测试工位', type: 'STANDALONE' },
    { code: 'WC-FRONT-ASSY', name: '前面板组装线', type: 'FLOW_LINE' },
    { code: 'WC-REAR-ASSY', name: '后面板组装线', type: 'FLOW_LINE' },
    { code: 'WC-MAIN-ASSY', name: '总装校准线', type: 'FLOW_LINE' },
    { code: 'WC-FQC', name: '成品质量检验', type: 'STANDALONE' },
    { code: 'WC-PACKING', name: '包装出货工位', type: 'STANDALONE' },
  ];

  for (const wc of workCenters) {
    await prisma.workCenter.upsert({
      where: { workCenterCode: wc.code },
      update: { name: wc.name, type: wc.type },
      create: { workCenterCode: wc.code, name: wc.name, type: wc.type },
    });
  }
  console.log('Work centers seeded.');

  // 2. Create Suppliers
  const suppliers = [
    { code: 'SUP-ELEC', name: '智慧电子配件有限公司', contact: '张工' },
    { code: 'SUP-MECH', name: '精工金属制品厂', contact: '李经理' },
    { code: 'SUP-PACK', name: '恒嘉包装材料厂', contact: '王小姐' },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierCode: sup.code },
      update: { name: sup.name, contact: sup.contact },
      create: { supplierCode: sup.code, name: sup.name, contact: sup.contact },
    });
  }
  console.log('Suppliers seeded.');

  // 3. Create Items (Materials & Assemblies)
  const baseItems = [
    { code: 'PCBA01', name: '智能锁主控PCBA', type: 'ASSEMBLY', unit: 'PCS', source: 'PURCHASED' },
    { code: 'FPNL01', name: '铝合金前壳体', type: 'MATERIAL', unit: 'PCS', source: 'PURCHASED' },
    { code: 'RPNL01', name: '铝合金后壳体', type: 'MATERIAL', unit: 'PCS', source: 'PURCHASED' },
    { code: 'MOTOR1', name: '直流减速电机', type: 'MATERIAL', unit: 'PCS', source: 'PURCHASED' },
    { code: 'LTCH01', name: '电子锁体(6068)', type: 'MATERIAL', unit: 'PCS', source: 'PURCHASED' },
    { code: 'SCRW01', name: '不锈钢螺丝包', type: 'MATERIAL', unit: 'SET', source: 'PURCHASED' },
    { code: 'BATT01', name: '1.5V AA碱性电池', type: 'MATERIAL', unit: 'PCS', source: 'PURCHASED' },
    { code: 'PACK01', name: 'igloohome品牌包装盒', type: 'MATERIAL', unit: 'SET', source: 'PURCHASED' },
  ];

  for (const item of baseItems) {
    await prisma.item.upsert({
      where: { itemCode: item.code },
      update: { itemName: item.name, itemType: item.type, unit: item.unit, sourceType: item.source },
      create: { itemCode: item.code, itemName: item.name, itemType: item.type, unit: item.unit, sourceType: item.source },
    });
  }

  // 4. Create Product Items (igloohome lineup)
  const products = [
    { code: 'IGB4P2', name: 'Padlock 2 (智能挂锁 2)', group: 'Padlocks' },
    { code: 'IGB4PL', name: 'Padlock Lite (智能挂锁 简版)', group: 'Padlocks' },
    { code: 'IGB4DG', name: 'Deadbolt Go (智能单舌锁)', group: 'Deadbolts' },
    { code: 'IGB4DS', name: 'Deadbolt 2S (智能单舌锁 2S)', group: 'Deadbolts' },
    { code: 'IGB4KB', name: 'Keybox 3 (智能钥匙盒 3)', group: 'Lock Boxes' },
    { code: 'IGB4MT', name: 'Mortise Touch (智能大门锁 旗舰版)', group: 'Mortises' },
    { code: 'IGB4GL', name: 'Glass Door Lock (玻璃门锁)', group: 'Rim Locks' },
    { code: 'IGB4RL', name: 'Rim Lock (侧边锁)', group: 'Rim Locks' },
    { code: 'IGB4D2', name: 'Deadbolt 2E (智能单舌锁 2E)', group: 'Deadbolts' },
    { code: 'IGB42E', name: 'Padlock 2E (智能挂锁 2E)', group: 'Padlocks' },
  ];

  for (const p of products) {
    await prisma.item.upsert({
      where: { itemCode: p.code },
      update: { itemName: p.name, itemType: 'PRODUCT', unit: 'SET', sourceType: 'MANUFACTURED', itemGroup: p.group },
      create: { itemCode: p.code, itemName: p.name, itemType: 'PRODUCT', unit: 'SET', sourceType: 'MANUFACTURED', itemGroup: p.group },
    });

    // 5. Create BOM for each product
    const bomHeader = await prisma.bomHeader.upsert({
      where: { parentItemCode_version: { parentItemCode: p.code, version: 'V1' } },
      update: { isActive: true },
      create: { parentItemCode: p.code, version: 'V1', isActive: true },
    });

    // Components (simplified for all products for demo)
    const components = [
      { code: 'PCBA01', qty: 1 },
      { code: 'FPNL01', qty: 1 },
      { code: 'RPNL01', qty: 1 },
      { code: 'MOTOR1', qty: 1 },
      { code: 'LTCH01', qty: 1 },
      { code: 'SCRW01', qty: 1 },
      { code: 'BATT01', qty: 4 },
      { code: 'PACK01', qty: 1 },
    ];

    for (const comp of components) {
      await prisma.bomLine.upsert({
        where: { bomHeaderId_componentItemCode: { bomHeaderId: bomHeader.id, componentItemCode: comp.code } },
        update: { quantity: comp.qty },
        create: { bomHeaderId: bomHeader.id, componentItemCode: comp.code, quantity: comp.qty },
      });
    }

    // 6. Create Routing for each product
    const routingHeader = await prisma.routingHeader.upsert({
      where: { itemCode_version: { itemCode: p.code, version: 'V1' } },
      update: {},
      create: { itemCode: p.code, version: 'V1' },
    });

    const ops = [
      { seq: 10, name: 'PCBA预检测', ws: 'WC-PCBA-TEST', time: 60 },
      { seq: 20, name: '前壳体模块组装', ws: 'WC-FRONT-ASSY', time: 120 },
      { seq: 30, name: '后壳体模块组装', ws: 'WC-REAR-ASSY', time: 150 },
      { seq: 40, name: '整机合拢与同步', ws: 'WC-MAIN-ASSY', time: 300 },
      { seq: 50, name: 'FQC功能综合测试', ws: 'WC-FQC', time: 180, inspection: true },
      { seq: 60, name: '附件配齐与包装', ws: 'WC-PACKING', time: 90 },
    ];

    for (const op of ops) {
      await prisma.routingOperation.upsert({
        where: { routingHeaderId_sequence: { routingHeaderId: routingHeader.id, sequence: op.seq } },
        update: { operationName: op.name, workstation: op.ws, standardTimeSec: op.time, isInspectionPoint: !!op.inspection },
        create: {
          routingHeaderId: routingHeader.id,
          sequence: op.seq,
          operationName: op.name,
          workstation: op.ws,
          standardTimeSec: op.time,
          isInspectionPoint: !!op.inspection,
        },
      });
    }
  }

  console.log('igloohome Products, BOMs and Routings seeded.');
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
