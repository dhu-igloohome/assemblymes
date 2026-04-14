import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🔥 Initializing Real-World Factory Organization Loop...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    // 1. 创建员工与账号矩阵 (解决“疏忽”的核心：建立人员池)
    const factoryStaff = [
      { no: 'STAFF-001', name: 'Admin.Huang', team: 'Management', role: 'SUPER_ADMIN' },
      { no: 'STAFF-002', name: 'Planner.Zhang', team: 'Planning', role: 'PLANNER' },
      { no: 'STAFF-003', name: 'QC.Li', team: 'Quality', role: 'QUALITY' },
      { no: 'WORK-001', name: 'Operator.Wang', team: 'Assembly-Line-A', role: 'PRODUCTION' },
      { no: 'WORK-002', name: 'Operator.Zhao', team: 'Assembly-Line-A', role: 'PRODUCTION' },
      { no: 'WORK-003', name: 'Operator.Sun', team: 'Flash-Station', role: 'PRODUCTION' },
    ];

    const staffMap: any = {};
    for (const staff of factoryStaff) {
      const emp = await prisma.employee.upsert({
        where: { employeeNo: staff.no },
        update: { name: staff.name, team: staff.team },
        create: { employeeNo: staff.no, name: staff.name, team: staff.team }
      });
      staffMap[staff.no] = emp;

      await prisma.systemUser.upsert({
        where: { username: staff.no.toLowerCase() },
        update: { role: staff.role as any },
        create: { 
          username: staff.no.toLowerCase(), 
          passwordHash: hashedPassword, 
          role: staff.role as any,
          employeeId: emp.id
        }
      });
    }

    // 2. 基础物料
    await prisma.item.upsert({
      where: { itemCode: 'SL-MAX' },
      update: {},
      create: { itemCode: 'SL-MAX', itemName: 'Ultimate Smart Lock', itemType: 'PRODUCT' as any, unit: 'PCS', safetyStock: 20 }
    });

    // 3. 业务流：由 Planner.Zhang 触发的订单
    const so = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-LOOP-' + Math.floor(Math.random()*1000),
        customerName: 'Enterprise Client',
        skuItemCode: 'SL-MAX',
        orderedQty: 200,
        unitPrice: 299,
        status: 'CONFIRMED' as any,
        createdBy: 'STAFF-002' // Planner.Zhang
      }
    });

    const wo = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-REAL-' + Math.floor(Math.random()*1000),
        salesOrderId: so.id,
        skuItemCode: 'SL-MAX',
        batchNo: 'B-20240414',
        plannedQty: 200,
        status: 'IN_PROGRESS' as any,
        createdBy: 'STAFF-002'
      }
    });

    // 4. 报工流：由 Operator.Wang 和 Operator.Zhao 协同完成
    const op1 = await prisma.workOrderOperation.create({
      data: {
        workOrderId: wo.id,
        sequence: 10,
        operationName: 'Main Assembly',
        workstation: 'ST-01',
        standardTimeSec: 60,
        status: 'COMPLETED' as any,
        completedQty: 200
      }
    });

    await prisma.productionReport.create({
      data: {
        workOrderOperationId: op1.id,
        operator: 'Operator.Wang', // 真实的报工主体
        goodQty: 120,
        remarks: 'Morning Shift Output'
      }
    });

    await prisma.productionReport.create({
      data: {
        workOrderOperationId: op1.id,
        operator: 'Operator.Zhao', // 协同报工
        goodQty: 80,
        remarks: 'Afternoon Shift Output'
      }
    });

    // 5. 异常流：由 Operator.Sun 发起的 Andon
    await prisma.issueRecord.create({
      data: {
        issueType: 'QUALITY' as any,
        description: 'PCB Surface Oxidation found at Flash Station',
        status: 'OPEN' as any,
        reporter: 'Operator.Sun',
        workOrderId: wo.id
      }
    });

    // 6. 品质流：由 QC.Li 记录的 FQC
    await prisma.qualityInspection.create({
      data: {
        inspectionNo: 'FQC-REAL-' + Date.now().toString().slice(-4),
        itemCode: 'SL-MAX',
        stage: 'OQC' as any,
        sampleSize: 50,
        defectQty: 2,
        result: 'PASS' as any,
        inspectedBy: 'QC.Li',
        issueSummary: 'Minor packaging dents, acceptable.'
      }
    });

    return NextResponse.json({ success: true, message: 'Factory Org Scenarios Loaded' });
  } catch (error: any) {
    console.error('Seed Org Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
