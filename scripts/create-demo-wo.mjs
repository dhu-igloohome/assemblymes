import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const itemCode = 'SMART-LOCK-演示';
  let item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) {
    item = await prisma.item.create({
      data: { itemCode, itemName: '智能门锁 (扫码演示专用)', itemType: 'PRODUCT', unit: 'PCS', safetyStock: 10 }
    });
  }
  const woNo = 'TEST-WO-2026';
  await prisma.workOrder.deleteMany({ where: { workOrderNo: woNo } });
  const wo = await prisma.workOrder.create({
    data: {
      workOrderNo: woNo,
      skuItemCode: itemCode,
      plannedQty: 100,
      status: 'RELEASED',
      batchNo: 'B2026-04-09',
      operations: {
        create: [
          { sequence: 10, operationName: 'PCB组装与烧录', workstation: 'WC-01', standardTimeSec: 45, completedQty: 45, status: 'STARTED' },
          { sequence: 20, operationName: '锁体机械装配', workstation: 'WC-02', standardTimeSec: 120, completedQty: 10, status: 'STARTED' },
          { sequence: 30, operationName: '整机功能测试', workstation: 'WC-03', standardTimeSec: 60, completedQty: 0, status: 'PENDING' },
          { sequence: 40, operationName: '成品包装入库', workstation: 'WC-04', standardTimeSec: 30, completedQty: 0, status: 'PENDING' }
        ]
      }
    }
  });
  console.log('Test WO created:', wo.workOrderNo);
}
main().finally(() => prisma.$disconnect());
