import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemType, WOStatus, IssueType, InspectionStage, InspectionResult } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🔥 Initializing Ultimate Full-Stack Closed Loop...');

    // --- 1. 用户与组织闭环 ---
    const hashedPassword = await bcrypt.hash('123456', 10);
    const users = [
      { username: 'admin_demo', role: 'ADMIN' },
      { username: 'planner_demo', role: 'PLANNER' },
      { username: 'worker_demo', role: 'WORKER' }
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { username: u.username },
        update: { role: u.role as any },
        create: { username: u.username, password: hashedPassword, role: u.role as any }
      });
    }

    // --- 2. 基础数据 (Master Data) ---
    // 创建一个名为 "SmartLock-X1" 的产品及其 BOM 结构
    const product = await prisma.item.upsert({
      where: { itemCode: 'SL-X1' },
      update: {},
      create: { itemCode: 'SL-X1', itemName: '智能锁-全栈闭环测试款', itemType: 'PRODUCT', unit: 'PCS', safetyStock: 50 }
    });

    const pcba = await prisma.item.upsert({
      where: { itemCode: 'M-PCBA-01' },
      update: {},
      create: { itemCode: 'M-PCBA-01', itemName: '核心主控板', itemType: 'MATERIAL', unit: 'PCS', safetyStock: 200 }
    });

    // 建立 BOM 关联
    const bom = await prisma.bomHeader.upsert({
      where: { parentItemCode: 'SL-X1' },
      update: { isActive: true },
      create: { 
        parentItemCode: 'SL-X1', 
        version: 'V1.0', 
        isActive: true,
        lines: {
          create: [
            { componentItemCode: 'M-PCBA-01', quantity: 1 }
          ]
        }
      }
    });

    // --- 3. 正常交付闭环 (Scenario: Success) ---
    const soNormal = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-NORMAL-001',
        customerName: '优质客户-顺丰交付',
        skuItemCode: 'SL-X1',
        orderedQty: 50,
        unitPrice: 500,
        status: 'CLOSED',
        dueDate: new Date()
      }
    });

    const woNormal = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-SUCCESS-01',
        salesOrderId: soNormal.id,
        skuItemCode: 'SL-X1',
        plannedQty: 50,
        status: 'DONE',
        actualStartDate: new Date(Date.now() - 86400000),
        actualEndDate: new Date()
      }
    });

    // --- 4. 异常链路 A: 生产中设备故障 (Scenario: Andon Alert) ---
    const soBroken = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-FAIL-002',
        customerName: '测试客户-报工异常场景',
        skuItemCode: 'SL-X1',
        orderedQty: 100,
        unitPrice: 500,
        status: 'CONFIRMED',
        dueDate: new Date(Date.now() + 86400000)
      }
    });

    const woBroken = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-ANDON-02',
        salesOrderId: soBroken.id,
        skuItemCode: 'SL-X1',
        plannedQty: 100,
        status: 'IN_PROGRESS'
      }
    });

    await prisma.issueRecord.create({
      data: {
        issueType: 'EQUIPMENT',
        description: '自动螺丝机卡料，生产线停滞',
        status: 'OPEN',
        reporter: 'worker_demo',
        reportedAt: new Date()
      }
    });

    // --- 5. 异常链路 B: 品质终检失败 (Scenario: Quality Fail) ---
    const soQC = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-QC-003',
        customerName: '测试客户-终检不合格场景',
        skuItemCode: 'SL-X1',
        orderedQty: 20,
        unitPrice: 500,
        status: 'CONFIRMED',
        dueDate: new Date(Date.now() + 172800000)
      }
    });

    await prisma.qualityInspection.create({
      data: {
        inspectionNo: 'FQC-20240410-01',
        itemCode: 'SL-X1',
        stage: 'FQC',
        sampleSize: 20,
        defectQty: 5,
        result: 'FAIL',
        inspectedBy: 'qc_admin',
        issueSummary: '面壳有明显划痕，批量外观不良',
        disposition: '全部返修'
      }
    });

    // --- 6. 库存缺料闭环 (Scenario: Material Gap) ---
    // PCBA 库存仅有 10 个，但订单需要 500 个
    const wh = await prisma.warehouse.upsert({
      where: { warehouseCode: 'WH-MAIN' },
      update: {},
      create: { warehouseCode: 'WH-MAIN', name: '总装厂主仓库' }
    });
    const loc = await prisma.storageLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId: wh.id, locationCode: 'BIN-01' } },
      update: {},
      create: { warehouseId: wh.id, locationCode: 'BIN-01', name: '电子件存放区' }
    });

    await prisma.inventoryBalance.upsert({
      where: { itemCode_locationId: { itemCode: 'M-PCBA-01', locationId: loc.id } },
      update: { quantity: 10 },
      create: { itemCode: 'M-PCBA-01', locationId: loc.id, quantity: 10 }
    });

    // 创建一个大额订单触发缺料
    await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-GAP-004',
        customerName: '大客户-缺料场景',
        skuItemCode: 'SL-X1',
        orderedQty: 500,
        unitPrice: 480,
        status: 'CONFIRMED',
        dueDate: new Date(Date.now() + 604800000)
      }
    });

    console.log('✅ Ultimate Closed Loop Seeded Successfully.');
    return NextResponse.json({ success: true, message: 'Super loop initialized' });
  } catch (error: any) {
    console.error('Super Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
