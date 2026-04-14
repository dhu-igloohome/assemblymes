import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('🚀 Ultimate Seed Starting...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Simplified but full-stack data
    const emp = await prisma.employee.upsert({
      where: { employeeNo: 'ADMIN-001' },
      update: {},
      create: { employeeNo: 'ADMIN-001', name: 'Master User', team: 'IT' }
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

    await prisma.item.upsert({
      where: { itemCode: 'PRD-01' },
      update: {},
      create: { itemCode: 'PRD-01', itemName: 'Assembly Lock Pro', itemType: 'PRODUCT' as any, unit: 'PCS', safetyStock: 10 }
    });

    await prisma.salesOrder.create({
      data: {
        orderNo: 'SO-' + Date.now().toString().slice(-4),
        customerName: 'Global Client',
        skuItemCode: 'PRD-01',
        orderedQty: 50,
        unitPrice: 199.99,
        status: 'CONFIRMED' as any
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
