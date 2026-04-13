import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('🚀 Starting Full Lifecycle Seeding via API...');

    // 1. Items
    const items = [
      { itemCode: '800001', itemName: '智能锁成品-旗舰款', itemType: 'PRODUCT', unit: 'PCS', safetyStock: 100 },
      { itemCode: '100001', itemName: '主控板 PCBA', itemType: 'ASSEMBLY', unit: 'PCS', safetyStock: 200 },
      { itemCode: '100002', itemName: '锁体总成', itemType: 'ASSEMBLY', unit: 'PCS', safetyStock: 150 },
      { itemCode: '200001', itemName: '锂电池 5000mAh', itemType: 'MATERIAL', unit: 'PCS', safetyStock: 500 },
      { itemCode: '200002', itemName: '面壳组件', itemType: 'MATERIAL', unit: 'PCS', safetyStock: 300 },
    ];

    for (const item of items) {
      await prisma.item.upsert({
        where: { itemCode: item.itemCode },
        update: item,
        create: item,
      });
    }

    // 2. Sales Orders
    const soNos = ['SO20240410-001', 'SO20240410-002', 'SO20240410-003', 'SO20240410-004', 'SO20240410-005'];
    const customers = ['客户-旗舰店', '客户-工程承包商', '客户-海外出口', '客户-部分交付场景', '客户-FQC终检失败'];
    
    const createdSOs = [];
    for (let i = 0; i < 5; i++) {
      const so = await prisma.salesOrder.upsert({
        where: { orderNo: soNos[i] },
        update: {
          customerName: customers[i],
          skuItemCode: '800001',
          orderedQty: 100 + i * 50,
          unitPrice: 299.00,
          status: i === 0 ? 'CLOSED' : 'CONFIRMED',
          dueDate: new Date(Date.now() + 86400000 * (i + 1)),
        },
        create: {
          orderNo: soNos[i],
          customerName: customers[i],
          skuItemCode: '800001',
          orderedQty: 100 + i * 50,
          unitPrice: 299.00,
          status: i === 0 ? 'CLOSED' : 'CONFIRMED',
          dueDate: new Date(Date.now() + 86400000 * (i + 1)),
        },
      });
      createdSOs.push(so);
    }

    // 3. Work Orders
    const woNos = ['WO-8699-1', 'WO-8699-2', 'WO-8699-3', 'WO-8699-4', 'WO-8699-5'];
    const statuses = ['DONE', 'DONE', 'IN_PROGRESS', 'RELEASED', 'PLANNED'];
    
    for (let i = 0; i < 5; i++) {
      const wo = await prisma.workOrder.upsert({
        where: { workOrderNo: woNos[i] },
        update: {
          salesOrderId: createdSOs[i].id,
          skuItemCode: '800001',
          batchNo: 'BATCH-20240410',
          plannedQty: createdSOs[i].orderedQty,
          status: statuses[i] as any,
        },
        create: {
          workOrderNo: woNos[i],
          salesOrderId: createdSOs[i].id,
          skuItemCode: '800001',
          batchNo: 'BATCH-20240410',
          plannedQty: createdSOs[i].orderedQty,
          status: statuses[i] as any,
        },
      });

      const op = await prisma.workOrderOperation.upsert({
        where: { workOrderId_sequence: { workOrderId: wo.id, sequence: 10 } },
        update: {
          operationName: 'Final Assembly',
          workstation: 'ST-01',
          standardTimeSec: 60,
          status: i < 2 ? 'COMPLETED' : (i === 2 ? 'STARTED' : 'PENDING'),
          completedQty: i < 2 ? wo.plannedQty : (i === 2 ? Math.floor(wo.plannedQty / 2) : 0),
        },
        create: {
          workOrderId: wo.id,
          sequence: 10,
          operationName: 'Final Assembly',
          workstation: 'ST-01',
          standardTimeSec: 60,
          status: i < 2 ? 'COMPLETED' : (i === 2 ? 'STARTED' : 'PENDING'),
          completedQty: i < 2 ? wo.plannedQty : (i === 2 ? Math.floor(wo.plannedQty / 2) : 0),
        },
      });

      if (i <= 2) {
        await prisma.productionReport.create({
          data: {
            workOrderOperationId: op.id,
            operator: 'Robot-1',
            goodQty: i < 2 ? wo.plannedQty : Math.floor(wo.plannedQty / 2),
          }
        });
      }
    }

    // 4. Andon Issues
    const issueTypes = ['MATERIAL', 'QUALITY', 'EQUIPMENT'];
    const descriptions = ['Line 1 shortage: 5000mAh Battery', 'FQC yield drop at Final Station', 'Station 3 glue gun failure'];
    
    for (let i = 0; i < 3; i++) {
      await prisma.issueRecord.create({
        data: {
          issueType: issueTypes[i] as any,
          status: 'OPEN',
          description: descriptions[i],
          reporter: 'System-Auto',
          reportedAt: new Date(),
        }
      });
    }

    // 5. Inventory Shortage
    const wh = await prisma.warehouse.upsert({
      where: { warehouseCode: 'WH01' },
      update: { name: 'Main Factory Warehouse' },
      create: { warehouseCode: 'WH01', name: 'Main Factory Warehouse' },
    });

    const loc = await prisma.storageLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId: wh.id, locationCode: 'LOC-A1' } },
      update: { name: 'A-Zone Shelf 1' },
      create: { warehouseId: wh.id, locationCode: 'LOC-A1', name: 'A-Zone Shelf 1' },
    });

    await prisma.inventoryBalance.upsert({
      where: { itemCode_locationId: { itemCode: '200001', locationId: loc.id } },
      update: { quantity: 50 },
      create: { itemCode: '200001', locationId: loc.id, quantity: 50 },
    });

    await prisma.inventoryBalance.upsert({
      where: { itemCode_locationId: { itemCode: '200002', locationId: loc.id } },
      update: { quantity: 10 },
      create: { itemCode: '200002', locationId: loc.id, quantity: 10 },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
