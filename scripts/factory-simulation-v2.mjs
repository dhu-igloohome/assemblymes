import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';

// 确保读取 .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const prisma = new PrismaClient();
const dec = (v) => new Prisma.Decimal(v);

async function runSimulation() {
  console.log('🏗️  启动数字化工厂全链路模拟 v2.0...');
  const timestamp = Date.now().toString().slice(-4);
  const skuCode = '600002'; // 使用新物料避免冲突

  // 1. 基础数据准备
  console.log('Step 1: 准备物料与工艺...');
  await prisma.item.upsert({
    where: { itemCode: skuCode },
    update: {},
    create: {
      itemCode: skuCode,
      itemName: '智能指纹锁 Pro Max',
      itemType: 'PRODUCT',
      unit: 'PCS',
      safetyStock: 100, // 设置安全库存以触发预警
      sourceType: 'MANUFACTURED'
    }
  });

  const wc = await prisma.workCenter.upsert({
    where: { workCenterCode: 'WC-LINE-01' },
    update: {},
    create: { workCenterCode: 'WC-LINE-01', name: '全自动组装线', type: 'FLOW_LINE' }
  });

  // 2. 创建 5 笔不同场景的订单
  const scenarios = [
    { id: '1', name: '全流程顺畅', status: 'SHIPPED' },
    { id: '2', name: 'IQC 质量异常', status: 'CONFIRMED' },
    { id: '3', name: '生产中 Andon 异常', status: 'CONFIRMED' },
    { id: '4', name: 'FQC 终检失败', status: 'CONFIRMED' },
    { id: '5', name: '部分交付场景', status: 'PARTIALLY_SHIPPED' }
  ];

  for (const scene of scenarios) {
    const orderNo = `SO-${timestamp}-${scene.id}`;
    console.log(`\n--- 正在模拟场景 ${scene.id}: ${scene.name} (${orderNo}) ---`);

    const so = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerName: `客户-${scene.name}`,
        skuItemCode: skuCode,
        orderedQty: 50,
        unitPrice: dec(599),
        status: scene.status === 'SHIPPED' ? 'CLOSED' : 'CONFIRMED',
        confirmedAt: new Date(),
        createdBy: 'Simulation-Agent'
      }
    });

    // 场景关联逻辑
    if (scene.id === '1') {
      // 模拟正常报工入库
      const wo = await prisma.workOrder.create({
        data: {
          workOrderNo: `WO-${orderNo}`,
          skuItemCode: skuCode,
          batchNo: `BATCH-${timestamp}`,
          plannedQty: 50,
          status: 'DONE',
          salesOrderId: so.id
        }
      });
      console.log(`✓ [正常] 工单已完成入库`);
    }

    if (scene.id === '2') {
      // 模拟 IQC 失败
      await prisma.qualityInspection.create({
        data: {
          inspectionNo: `IQC-${orderNo}`,
          stage: 'IQC',
          result: 'FAIL',
          itemCode: '100001',
          issueSummary: '原材料表面有划痕',
          inspectedBy: 'QA-01'
        }
      });
      console.log(`⚠️  [异常] 触发 IQC 拦截`);
    }

    if (scene.id === '3') {
      // 模拟生产中 Andon
      const wo = await prisma.workOrder.create({
        data: {
          workOrderNo: `WO-${orderNo}`,
          skuItemCode: skuCode,
          batchNo: `BATCH-${timestamp}`,
          plannedQty: 50,
          status: 'IN_PROGRESS',
          salesOrderId: so.id
        }
      });
      await prisma.issueRecord.create({
        data: {
          issueType: 'MATERIAL',
          status: 'OPEN',
          description: '缺料预警：主板库存不足',
          workOrderId: wo.id,
          reporter: '组装工位-01'
        }
      });
      console.log(`⚠️  [异常] 触发 Andon 呼叫`);
    }

    if (scene.id === '4') {
      // 模拟 FQC 失败
      const wo = await prisma.workOrder.create({
        data: {
          workOrderNo: `WO-${orderNo}`,
          skuItemCode: skuCode,
          batchNo: `BATCH-${timestamp}`,
          plannedQty: 50,
          status: 'DONE',
          salesOrderId: so.id
        }
      });
      await prisma.qualityInspection.create({
        data: {
          inspectionNo: `FQC-${orderNo}`,
          stage: 'OQC',
          result: 'FAIL',
          itemCode: skuCode,
          workOrderNo: wo.workOrderNo,
          issueSummary: '静电测试不通过',
          inspectedBy: 'QA-02'
        }
      });
      console.log(`⚠️  [异常] 触发 FQC 拦截`);
    }

    if (scene.id === '5') {
      // 模拟部分发货
      await prisma.shipment.create({
        data: {
          shipmentNo: `SHP-${orderNo}`,
          salesOrderId: so.id,
          shippedQty: 20,
          status: 'POSTED',
          operator: '仓管员-01'
        }
      });
      console.log(`✓ [正常] 已执行部分发货`);
    }
  }

  console.log('\n✨ 模拟完成！');
  await prisma.$disconnect();
}

runSimulation();
