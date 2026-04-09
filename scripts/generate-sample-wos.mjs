import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = [
    { code: '800001', name: 'SL-A100 基础款智能锁', desc: '标准密码+卡片' },
    { code: '800002', name: 'SL-B200 指纹识别锁', desc: '半导体指纹识别' },
    { code: '800003', name: 'SL-C300 3D人脸锁', desc: '双目人脸识别' },
    { code: '800004', name: 'SL-D400 蓝牙智能锁', desc: '低功耗蓝牙连接' },
    { code: '800005', name: 'SL-E500 霸王锁体智能锁', desc: '适配大型门体' },
    { code: '800006', name: 'SL-F600 公寓键盘锁', desc: '窄边框设计' },
    { code: '800007', name: 'SL-G700 玻璃门指纹锁', desc: '免打孔安装' },
    { code: '800008', name: 'SL-H800 酒店房门锁', desc: 'RFID 高频卡' },
    { code: '800009', name: 'SL-I900 全铜奢华智能锁', desc: '欧式仿古设计' },
    { code: '800010', name: 'SL-J1000 智能挂锁', desc: '超长待机' },
  ];

  console.log('--- 开始生成 10 组产品实例 ---');

  for (const p of products) {
    // 1. 创建物料
    const item = await prisma.item.upsert({
      where: { itemCode: p.code },
      update: { itemName: p.name, description: p.desc },
      create: {
        itemCode: p.code,
        itemName: p.name,
        description: p.desc,
        itemType: 'PRODUCT',
        unit: 'PCS',
        status: 'ENABLED',
        sourceType: 'MANUFACTURED',
      },
    });

    // 2. 获取默认工作中心 (如果没有则创建)
    let wc = await prisma.workCenter.findFirst();
    if (!wc) {
      wc = await prisma.workCenter.create({
        data: {
          workCenterCode: 'WC-001',
          name: '智能锁总装线',
          type: 'FLOW_LINE',
          dailyCapacity: 500,
        },
      });
    }

    // 3. 创建工艺路线
    const routing = await prisma.routingHeader.upsert({
        where: { itemCode_version: { itemCode: p.code, version: 'V1' } },
        update: {},
        create: {
            itemCode: p.code,
            version: 'V1',
            operations: {
                create: [
                    { sequence: 10, operationName: '备料/领料', workstation: wc.workCenterCode, standardTimeSec: 30 },
                    { sequence: 20, operationName: '面板组装', workstation: wc.workCenterCode, standardTimeSec: 120 },
                    { sequence: 30, operationName: '功能测试', workstation: wc.workCenterCode, standardTimeSec: 60, isInspectionPoint: true },
                    { sequence: 40, operationName: '成品包装', workstation: wc.workCenterCode, standardTimeSec: 45 },
                ],
            },
        }
    });

    // 4. 创建工单
    const woNo = `WO-${p.code}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const wo = await prisma.workOrder.create({
      data: {
        workOrderNo: woNo,
        skuItemCode: p.code,
        batchNo: `BATCH-${p.code}`,
        plannedQty: 1000 + Math.floor(Math.random() * 500),
        status: 'RELEASED',
        planStartDate: new Date(),
        planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 'system',
      },
    });

    // 5. 将工艺路线工序同步到工单工序
    const routingOps = await prisma.routingOperation.findMany({
      where: { routingHeaderId: routing.id },
      orderBy: { sequence: 'asc' },
    });

    for (const rop of routingOps) {
      await prisma.workOrderOperation.create({
        data: {
          workOrderId: wo.id,
          sequence: rop.sequence,
          operationName: rop.operationName,
          workstation: rop.workstation,
          standardTimeSec: rop.standardTimeSec,
          isInspectionPoint: rop.isInspectionPoint,
          status: 'PENDING',
          completedQty: 0,
        },
      });
    }

    console.log(`已创建: 产品 ${p.name} (${p.code}) -> 工单 ${woNo}`);
  }

  console.log('--- 生成完成 ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
