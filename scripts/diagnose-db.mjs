import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 强制读取 .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- 数据库诊断报告 ---');
  console.log('目标数据库:', process.env.DATABASE_URL?.split('@')[1] || '未知');
  
  try {
    const counts = {
      items: await prisma.item.count(),
      salesOrders: await prisma.salesOrder.count(),
      workOrders: await prisma.workOrder.count(),
      issues: await prisma.issueRecord.count(),
      inspections: await prisma.qualityInspection.count(),
      reports: await prisma.productionReport.count()
    };
    
    console.log('当前记录统计:', counts);
    
    if (counts.salesOrders > 0) {
      const lastOrder = await prisma.salesOrder.findFirst({ orderBy: { createdAt: 'desc' } });
      console.log('最新订单:', lastOrder?.orderNo, '状态:', lastOrder?.status);
    }
  } catch (err) {
    console.error('❌ 诊断失败:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
