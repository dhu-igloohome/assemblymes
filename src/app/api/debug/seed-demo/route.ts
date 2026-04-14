import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🔥 Initializing Ultimate Full-Stack Closed Loop Scenarios...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    // 1. 建立人员与账号闭环
    const emp = await prisma.employee.upsert({
      where: { employeeNo: 'DEMO-ADMIN' },
      update: {},
      create: { employeeNo: 'DEMO-ADMIN', name: 'Factory Master', team: 'Management' }
    });

    await prisma.systemUser.upsert({
      where: { username: 'admin_demo' },
      update: {},
      create: { 
        username: 'admin_demo', 
        passwordHash: hashedPassword, 
        role: 'SUPER_ADMIN' as any,
        employeeId: emp.id
      }
    });

    // 2. 基础物料：智能锁全栈款
    await prisma.item.upsert({
      where: { itemCode: 'SL-MAX' },
      update: {},
      create: { 
        itemCode: 'SL-MAX', 
        itemName: 'Ultimate Smart Lock (Scenario Test)', 
        itemType: 'PRODUCT' as any, 
        unit: 'PCS', 
        safetyStock: 20 
      }
    });

    // 3. 场景 A: 完美交付 (100% 达成)
    const soDone = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-SUCCESS-' + Math.floor(Math.random()*1000),
        customerName: 'Happy Path Client',
        skuItemCode: 'SL-MAX',
        orderedQty: 100,
        unitPrice: 299,
        status: 'CLOSED' as any,
        dueDate: new Date()
      }
    });

    const woDone = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-DONE-' + Math.floor(Math.random()*1000),
        salesOrderId: soDone.id,
        skuItemCode: 'SL-MAX',
        batchNo: 'BATCH-001',
        plannedQty: 100,
        status: 'DONE' as any
      }
    });

    // 为成功工单建立工序并报工 (使仪表盘产量数字跳动)
    const opDone = await prisma.workOrderOperation.create({
      data: {
        workOrderId: woDone.id,
        sequence: 10,
        operationName: 'Final Assembly',
        workstation: 'ST-01',
        standardTimeSec: 60,
        status: 'COMPLETED' as any,
        completedQty: 100
      }
    });

    await prisma.productionReport.create({
      data: {
        workOrderOperationId: opDone.id,
        operator: 'Factory Master',
        goodQty: 100,
        createdAt: new Date() // Today
      }
    });

    // 4. 场景 B: 生产线故障 (触发 Andon)
    const woBroken = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-FAIL-' + Math.floor(Math.random()*1000),
        skuItemCode: 'SL-MAX',
        batchNo: 'BATCH-002',
        plannedQty: 200,
        status: 'IN_PROGRESS' as any
      }
    });

    await prisma.issueRecord.create({
      data: {
        issueType: 'EQUIPMENT' as any,
        description: 'Robot Arm Calibration Error - Line 1 Stalled',
        status: 'OPEN' as any,
        reporter: 'System-Simulation',
        workOrderId: woBroken.id
      }
    });

    // 5. 场景 C: 终检失败 (品质预警)
    await prisma.qualityInspection.create({
      data: {
        inspectionNo: 'FQC-' + Date.now().toString().slice(-4),
        itemCode: 'SL-MAX',
        stage: 'OQC' as any,
        sampleSize: 50,
        defectQty: 12,
        result: 'FAIL' as any,
        inspectedBy: 'QC-Officer',
        issueSummary: 'Firmware Flash Fail - Batch 002',
        disposition: 'Return to Rework'
      }
    });

    return NextResponse.json({ success: true, message: 'Scenario Loaded' });
  } catch (error: any) {
    console.error('Seed Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
