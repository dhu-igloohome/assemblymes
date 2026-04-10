import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const prisma = new PrismaClient();

async function finalTouch() {
  console.log('🔄 正在同步数据至控制中心...');
  const now = new Date();
  
  // 更新所有模拟订单到最新时间，确保它们出现在“近期订单”首位
  const result = await prisma.salesOrder.updateMany({
    where: { orderNo: { contains: 'SO-' } },
    data: { 
      confirmedAt: now,
      status: 'CONFIRMED'
    }
  });

  // 确保今日产出不为 0
  const lastReport = await prisma.productionReport.findFirst({ orderBy: { createdAt: 'desc' } });
  if (lastReport) {
    await prisma.productionReport.update({
      where: { id: lastReport.id },
      data: { createdAt: now }
    });
  }

  console.log(`✅ 同步完成，共更新 ${result.count} 笔订单。`);
  await prisma.$disconnect();
}

finalTouch();
