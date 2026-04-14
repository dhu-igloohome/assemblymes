import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🔥 Initializing Ultimate Full-Stack Closed Loop...');

    // --- 1. 用户与组织闭环 ---
    const employees = [
      { employeeNo: 'EMP001', name: 'Admin Demo', team: 'IT' },
      { employeeNo: 'EMP002', name: 'Planner Demo', team: 'Planning' },
      { employeeNo: 'EMP003', name: 'Worker Demo', team: 'Production' }
    ];

    const createdEmployees = [];
    for (const emp of employees) {
      const e = await prisma.employee.upsert({
        where: { employeeNo: emp.employeeNo },
        update: { name: emp.name, team: emp.team },
        create: { employeeNo: emp.employeeNo, name: emp.name, team: emp.team }
      });
      createdEmployees.push(e);
    }

    const hashedPassword = await bcrypt.hash('123456', 10);
    const users = [
      { username: 'admin_demo', role: 'SUPER_ADMIN', empIdx: 0 },
      { username: 'planner_demo', role: 'PLANNER', empIdx: 1 },
      { username: 'worker_demo', role: 'PRODUCTION', empIdx: 2 }
    ];

    for (const u of users) {
      await prisma.systemUser.upsert({
        where: { username: u.username },
        update: { role: u.role as any },
        create: { 
          username: u.username, 
          passwordHash: hashedPassword, 
          role: u.role as any,
          employeeId: createdEmployees[u.empIdx].id
        }
      });
    }

    // --- 2. 基础数据 ---
    await prisma.item.upsert({
      where: { itemCode: 'SL-X1' },
      update: {},
      create: { itemCode: 'SL-X1', itemName: 'SmartLock-X1-Ultimate', itemType: 'PRODUCT' as any, unit: 'PCS', safetyStock: 50 }
    });

    await prisma.item.upsert({
      where: { itemCode: 'M-PCBA' },
      update: {},
      create: { itemCode: 'M-PCBA', itemName: 'Core-PCBA-Board', itemType: 'MATERIAL' as any, unit: 'PCS', safetyStock: 200 }
    });

    // --- 3. 正常交付闭环 ---
    const soNormal = await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-NORMAL-' + Date.now().toString().slice(-4),
        customerName: 'Premium Customer',
        skuItemCode: 'SL-X1',
        orderedQty: 50,
        unitPrice: 500,
        status: 'CLOSED' as any,
        dueDate: new Date()
      }
    });

    await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-DONE-' + Date.now().toString().slice(-4),
        salesOrderId: soNormal.id,
        skuItemCode: 'SL-X1',
        batchNo: 'B-SUCCESS',
        plannedQty: 50,
        status: 'DONE' as any
      }
    });

    // --- 4. 异常链路 A: 生产异常 ---
    const woBroken = await prisma.workOrder.create({
      data: {
        workOrderNo: 'WO-ERR-' + Date.now().toString().slice(-4),
        skuItemCode: 'SL-X1',
        batchNo: 'B-ANDON',
        plannedQty: 100,
        status: 'IN_PROGRESS' as any
      }
    });

    await prisma.issueRecord.create({
      data: {
        issueType: 'EQUIPMENT' as any,
        description: 'Auto-Screw Machine Jammed',
        status: 'OPEN' as any,
        reporter: 'worker_demo',
        workOrderId: woBroken.id
      }
    });

    // --- 5. 异常链路 B: 品质不合格 ---
    await prisma.qualityInspection.create({
      data: {
        inspectionNo: 'QC-' + Date.now().toString().slice(-4),
        itemCode: 'SL-X1',
        stage: 'OQC' as any,
        sampleSize: 20,
        defectQty: 5,
        result: 'FAIL' as any,
        inspectedBy: 'qc_admin',
        issueSummary: 'Scratch on Surface',
        disposition: 'Rework All'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Seed Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
