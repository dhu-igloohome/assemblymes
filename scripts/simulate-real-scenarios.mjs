import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

function dec(v) {
  return new Prisma.Decimal(v);
}

async function main() {
  console.log('🚀 开始执行数字化工厂多场景模拟 (5笔订单)...');
  const runId = Date.now().toString().slice(-4);
  const skuCode = '600001'; // 智能门锁 IGB4E
  
  // --- [步骤 0] 环境准备 (Master Data) ---
  console.log('\n--- [Step 0] 基础数据同步 ---');
  
  // 1. 仓库与库位
  const rawWh = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-RAW' },
    update: {},
    create: { 
      warehouseCode: 'WH-RAW', 
      name: '原材料仓', 
      locations: { create: { locationCode: 'L-RAW-01', name: '原料库位' } } 
    }
  });
  const fgWh = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-FG' },
    update: {},
    create: { 
      warehouseCode: 'WH-FG', 
      name: '成品仓', 
      locations: { create: { locationCode: 'L-FG-01', name: '成品库位' } } 
    }
  });
  const rawLoc = await prisma.storageLocation.findFirst({ where: { warehouseId: rawWh.id } });
  const fgLoc = await prisma.storageLocation.findFirst({ where: { warehouseId: fgWh.id } });

  // 2. 物料数据
  const items = [
    { itemCode: skuCode, itemName: '智能门锁 IGB4E', itemType: 'PRODUCT', unit: 'PCS', safetyStock: 50, sourceType: 'MANUFACTURED' },
    { itemCode: '100001', itemName: '电子锁体', itemType: 'MATERIAL', unit: 'PCS', safetyStock: 100, sourceType: 'PURCHASED' },
    { itemCode: '100002', itemName: '主控PCB板', itemType: 'MATERIAL', unit: 'PCS', safetyStock: 200, sourceType: 'PURCHASED' },
    { itemCode: '100003', itemName: '前后面板', itemType: 'MATERIAL', unit: 'SET', safetyStock: 50, sourceType: 'PURCHASED' }
  ];
  for (const it of items) {
    await prisma.item.upsert({ where: { itemCode: it.itemCode }, update: it, create: it });
  }

  // 3. BOM (V1.0)
  const bom = await prisma.bomHeader.upsert({
    where: { parentItemCode_version: { parentItemCode: skuCode, version: 'V1.0' } },
    update: { isActive: true },
    create: { parentItemCode: skuCode, version: 'V1.0', isActive: true }
  });
  const components = [
    { componentItemCode: '100001', quantity: 1 },
    { componentItemCode: '100002', quantity: 1 },
    { componentItemCode: '100003', quantity: 1 }
  ];
  for (const comp of components) {
    await prisma.bomLine.upsert({
      where: { bomHeaderId_componentItemCode: { bomHeaderId: bom.id, componentItemCode: comp.componentItemCode } },
      update: { quantity: dec(comp.quantity) },
      create: { bomHeaderId: bom.id, componentItemCode: comp.componentItemCode, quantity: dec(comp.quantity) }
    });
  }

  // 4. 工艺路线与工作中心
  const wc = await prisma.workCenter.upsert({
    where: { workCenterCode: 'WC-ASSY-01' },
    update: {},
    create: { workCenterCode: 'WC-ASSY-01', name: '组装一号线', type: 'FLOW_LINE' }
  });
  const routing = await prisma.routingHeader.upsert({
    where: { itemCode_version: { itemCode: skuCode, version: 'V1.0' } },
    update: {},
    create: { itemCode: skuCode, version: 'V1.0' }
  });
  await prisma.routingOperation.upsert({
    where: { routingHeaderId_sequence: { routingHeaderId: routing.id, sequence: 10 } },
    update: { operationName: '总装测试', workstation: 'WC-ASSY-01', standardTimeSec: 180, isInspectionPoint: true },
    create: { routingHeaderId: routing.id, sequence: 10, operationName: '总装测试', workstation: 'WC-ASSY-01', standardTimeSec: 180, isInspectionPoint: true }
  });

  // 5. 供应商
  const supplier = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-GLOBAL' },
    update: {},
    create: { supplierCode: 'SUP-GLOBAL', name: '环球电子材料' }
  });

  // --- [模拟订单开始] ---

  // SCENARIO 1: Happy Path (正常订单)
  console.log('\n--- Scenario 1: 正常流程 (SO-NORMAL) ---');
  const so1 = await createSO(`SO-${runId}-01`, 20);
  await processNormalFlow(so1, 'NORMAL');

  // SCENARIO 2: IQC Failure (来料检验异常)
  console.log('\n--- Scenario 2: IQC 检验失败 (SO-IQC-FAIL) ---');
  const so2 = await createSO(`SO-${runId}-02`, 10);
  await processIQCException(so2);

  // SCENARIO 3: Andon Call (生产过程异常)
  console.log('\n--- Scenario 3: Andon 生产异常 (SO-ANDON) ---');
  const so3 = await createSO(`SO-${runId}-03`, 15);
  await processProductionException(so3);

  // SCENARIO 4: FQC Failure (成品质量异常)
  console.log('\n--- Scenario 4: FQC 质量缺陷 (SO-FQC-FAIL) ---');
  const so4 = await createSO(`SO-${runId}-04`, 12);
  await processFQCException(so4);

  // SCENARIO 5: Partial Inventory (库存短缺/部分交付)
  console.log('\n--- Scenario 5: 交付异常 (SO-PARTIAL) ---');
  const so5 = await createSO(`SO-${runId}-05`, 30);
  await processPartialFlow(so5);

  console.log('\n✅ 所有模拟场景执行完毕。请返回 Dashboard 查看数据更新。');
  await prisma.$disconnect();
}

async function createSO(orderNo, qty) {
  return await prisma.salesOrder.create({
    data: {
      orderNo,
      customerName: '某智能家居品牌商',
      skuItemCode: '600001',
      orderedQty: qty,
      unitPrice: dec(299.00),
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      createdBy: 'System-Agent'
    }
  });
}

// 正常流程处理函数 (简化版)
async function processNormalFlow(so, label) {
  // 1. 生成工单
  const wo = await prisma.workOrder.create({
    data: {
      workOrderNo: `WO-${so.orderNo}`,
      skuItemCode: so.skuItemCode,
      batchNo: `B-${so.orderNo}`,
      plannedQty: so.orderedQty,
      status: 'RELEASED',
      salesOrderId: so.id
    }
  });
  
  // 2. 模拟报工
  const op = await prisma.workOrderOperation.create({
    data: {
      workOrderId: wo.id,
      sequence: 10,
      operationName: '组装',
      workstation: 'WC-ASSY-01',
      standardTimeSec: 100,
      status: 'COMPLETED',
      completedQty: so.orderedQty
    }
  });
  
  await prisma.productionReport.create({
    data: {
      workOrderOperationId: op.id,
      operator: '张工',
      goodQty: so.orderedQty,
      timeSpentSec: 100 * so.orderedQty
    }
  });

  // 3. 入库
  await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'DONE' } });
  console.log(`✓ 订单 ${so.orderNo} 报工完成`);
}

// 模拟 IQC 异常
async function processIQCException(so) {
  const po = await prisma.purchaseOrder.create({
    data: {
      poNo: `PO-${so.orderNo}`,
      supplierId: (await prisma.supplier.findFirst()).id,
      status: 'CONFIRMED',
      lines: {
        create: { itemCode: '100002', orderedQty: dec(so.orderedQty), unitPrice: dec(5.0) }
      }
    }
  });

  // 创建一个失败的 IQC 记录
  await prisma.qualityInspection.create({
    data: {
      inspectionNo: `IQC-${po.poNo}`,
      stage: 'IQC',
      result: 'FAIL',
      itemCode: '100002',
      sampleSize: 5,
      defectQty: 2,
      issueSummary: 'PCB板表面氧化严重',
      disposition: '退货处理',
      inspectedBy: '李质检'
    }
  });
  console.log(`⚠️ IQC 异常已记录: ${po.poNo} 检验失败`);
}

// 模拟生产 Andon 异常
async function processProductionException(so) {
  const wo = await prisma.workOrder.create({
    data: {
      workOrderNo: `WO-${so.orderNo}`,
      skuItemCode: so.skuItemCode,
      batchNo: `B-${so.orderNo}`,
      plannedQty: so.orderedQty,
      status: 'IN_PROGRESS',
      salesOrderId: so.id
    }
  });

  // 触发 Andon 呼叫
  await prisma.issueRecord.create({
    data: {
      issueType: 'EQUIPMENT',
      status: 'OPEN',
      description: '组装线一号机械臂突然停机，初步判定电机过热',
      workOrderId: wo.id,
      reporter: '王操作员',
      workCenterCode: 'WC-ASSY-01'
    }
  });
  console.log(`⚠️ Andon 异常已记录: 工单 ${wo.workOrderNo} 触发设备报修`);
}

// 模拟 FQC 异常
async function processFQCException(so) {
  const wo = await prisma.workOrder.create({
    data: {
      workOrderNo: `WO-${so.orderNo}`,
      skuItemCode: so.skuItemCode,
      batchNo: `B-${so.orderNo}`,
      plannedQty: so.orderedQty,
      status: 'DONE',
      salesOrderId: so.id
    }
  });

  await prisma.qualityInspection.create({
    data: {
      inspectionNo: `FQC-${wo.workOrderNo}`,
      stage: 'OQC',
      result: 'FAIL',
      itemCode: so.skuItemCode,
      workOrderNo: wo.workOrderNo,
      sampleSize: so.orderedQty,
      defectQty: 3,
      issueSummary: '蓝牙连接不稳定，部分无法通过老化测试',
      disposition: '返工重测',
      inspectedBy: '赵质检'
    }
  });
  console.log(`⚠️ FQC 异常已记录: 工单 ${wo.workOrderNo} 成品检验发现缺陷`);
}

// 模拟部分交付
async function processPartialFlow(so) {
  await prisma.salesOrder.update({
    where: { id: so.id },
    data: { status: 'PARTIALLY_SHIPPED' }
  });
  
  await prisma.shipment.create({
    data: {
      shipmentNo: `SHP-${so.orderNo}-P1`,
      salesOrderId: so.id,
      shippedQty: Math.floor(so.orderedQty / 2),
      status: 'POSTED',
      operator: '仓管员A'
    }
  });
  console.log(`✓ 订单 ${so.orderNo} 已模拟部分发货`);
}

main().catch(console.error);
