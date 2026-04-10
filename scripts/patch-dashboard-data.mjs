import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';

// 强制加载 .env.local 环境变量
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const prisma = new PrismaClient();
const dec = (v) => new Prisma.Decimal(v);

async function patchSimulation() {
  console.log('🧹 清理并注入高优先级实时数据...');
  const now = new Date();
  
  // 1. 确保至少有一个活跃异常 (Active Andon)
  await prisma.issueRecord.create({
    data: {
      issueType: 'QUALITY',
      status: 'OPEN',
      description: '紧急：主生产线传感器读数异常',
      reportedAt: now,
      reporter: '系统模拟'
    }
  });

  // 2. 确保今日有产出记录 (Today Output)
  const sku = '600002';
  const wo = await prisma.workOrder.findFirst({ where: { skuItemCode: sku } });
  if (wo) {
    const op = await prisma.workOrderOperation.findFirst({ where: { workOrderId: wo.id } });
    if (op) {
      await prisma.productionReport.create({
        data: {
          workOrderOperationId: op.id,
          operator: '智能工厂助手',
          goodQty: 88,
          timeSpentSec: 3600,
          createdAt: now // 强制使用当前时间
        }
      });
    }
  }

  // 3. 确保有库存预警 (Inventory Alerts)
  // 将一个物料的安全库存调高，使其高于当前余额
  await prisma.item.update({
    where: { itemCode: '600002' },
    data: { safetyStock: dec(9999) } 
  });

  console.log('✅ 数据补丁已推入。');
  await prisma.$disconnect();
}

patchSimulation();
