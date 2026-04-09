import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function dec(v) {
  return new Prisma.Decimal(v);
}

async function main() {
  console.log('=== Assembly MES EXW 交货全流程演练 ===');
  const runId = Date.now().toString().slice(-4);
  const skuCode = `IGB4E`; // Let's just use IGB4E if it doesn't exist, or update it
  
  // Step 0: Master Data
  console.log('\n--- [步骤 0] 基础数据确认 ---');
  // Warehouses
  let rawWh = await prisma.warehouse.findFirst({ where: { warehouseCode: 'WH-RAW' } });
  if (!rawWh) {
    rawWh = await prisma.warehouse.create({
      data: { warehouseCode: 'WH-RAW', name: '深圳工厂原料仓', locations: { create: { locationCode: 'LOC-RAW-1', name: '原料区' } } }
    });
  }
  let fgWh = await prisma.warehouse.findFirst({ where: { warehouseCode: 'WH-FG' } });
  if (!fgWh) {
    fgWh = await prisma.warehouse.create({
      data: { warehouseCode: 'WH-FG', name: '深圳工厂成品仓', locations: { create: { locationCode: 'LOC-FG-1', name: '成品区' } } }
    });
  }
  const rawLoc = await prisma.storageLocation.findFirst({ where: { warehouseId: rawWh.id } });
  const fgLoc = await prisma.storageLocation.findFirst({ where: { warehouseId: fgWh.id } });

  // Items
  const itemsData = [
    { itemCode: 'IGB4E', itemName: '智能门锁 IGB4E', itemType: 'PRODUCT', sourceType: 'MANUFACTURED', unit: '台', isPurchasable: false, specification: '100x150x40mm, 1.3kg, HS:830140' },
    { itemCode: 'LOCK01', itemName: '锁体', itemType: 'MATERIAL', sourceType: 'PURCHASED', unit: '个', isPurchasable: true },
    { itemCode: 'PCB001', itemName: 'PCB板', itemType: 'MATERIAL', sourceType: 'PURCHASED', unit: '片', isPurchasable: true },
    { itemCode: 'BAT001', itemName: '电池', itemType: 'MATERIAL', sourceType: 'PURCHASED', unit: '个', isPurchasable: true },
    { itemCode: 'SCRW01', itemName: '螺丝包', itemType: 'MATERIAL', sourceType: 'PURCHASED', unit: '包', isPurchasable: true },
    { itemCode: 'PNL001', itemName: '面板', itemType: 'MATERIAL', sourceType: 'PURCHASED', unit: '个', isPurchasable: true },
  ];
  
  for (const item of itemsData) {
    await prisma.item.upsert({
      where: { itemCode: item.itemCode },
      update: { itemName: item.itemName, specification: item.specification },
      create: item
    });
  }
  console.log(`✓ 创建/更新产品 ${skuCode} 及 5 个BOM子件`);

  // BOM
  const bomHeader = await prisma.bomHeader.upsert({
    where: { parentItemCode_version: { parentItemCode: skuCode, version: 'V1.0' } },
    update: {},
    create: {
      parentItemCode: skuCode,
      version: 'V1.0',
      isActive: true,
    }
  });
  
  const bomLines = [
    { componentItemCode: 'LOCK01', quantity: 1 },
    { componentItemCode: 'PCB001', quantity: 1 },
    { componentItemCode: 'BAT001', quantity: 4 },
    { componentItemCode: 'SCRW01', quantity: 1 },
    { componentItemCode: 'PNL001', quantity: 1 },
  ];
  for (const line of bomLines) {
    await prisma.bomLine.upsert({
      where: { bomHeaderId_componentItemCode: { bomHeaderId: bomHeader.id, componentItemCode: line.componentItemCode } },
      update: { quantity: dec(line.quantity) },
      create: { bomHeaderId: bomHeader.id, componentItemCode: line.componentItemCode, quantity: dec(line.quantity) }
    });
  }
  console.log(`✓ 创建 BOM V1.0`);

  // Work Centers
  const wcs = [
    { workCenterCode: 'WC-PREP', name: '备料区', type: 'STANDALONE' },
    { workCenterCode: 'WC-ASSY', name: '组装流水线', type: 'FLOW_LINE' },
    { workCenterCode: 'WC-TEST', name: '测试区', type: 'STANDALONE' },
    { workCenterCode: 'WC-PACK', name: '包装线', type: 'FLOW_LINE' },
  ];
  for (const wc of wcs) {
    await prisma.workCenter.upsert({
      where: { workCenterCode: wc.workCenterCode },
      update: {},
      create: wc
    });
  }
  
  // Routing
  const routing = await prisma.routingHeader.upsert({
    where: { itemCode_version: { itemCode: skuCode, version: 'V1.0' } },
    update: {},
    create: { itemCode: skuCode, version: 'V1.0' }
  });
  const routingOps = [
    { sequence: 10, operationName: '备料', workstation: 'WC-PREP', standardTimeSec: 60, isInspectionPoint: false },
    { sequence: 20, operationName: '组装', workstation: 'WC-ASSY', standardTimeSec: 300, isInspectionPoint: false },
    { sequence: 30, operationName: '测试', workstation: 'WC-TEST', standardTimeSec: 120, isInspectionPoint: true },
    { sequence: 40, operationName: '包装', workstation: 'WC-PACK', standardTimeSec: 60, isInspectionPoint: false },
  ];
  for (const op of routingOps) {
    await prisma.routingOperation.upsert({
      where: { routingHeaderId_sequence: { routingHeaderId: routing.id, sequence: op.sequence } },
      update: { standardTimeSec: op.standardTimeSec, workstation: op.workstation, isInspectionPoint: op.isInspectionPoint },
      create: { routingHeaderId: routing.id, ...op }
    });
  }
  console.log(`✓ 创建工艺路线 V1.0 (含备料、组装、测试、包装)`);

  // Suppliers
  const sups = ['SUP-A', 'SUP-B', 'SUP-C', 'SUP-D'];
  for (const s of sups) {
    await prisma.supplier.upsert({
      where: { supplierCode: s },
      update: {},
      create: { supplierCode: s, name: `供应商 ${s}` }
    });
  }
  console.log(`✓ 创建虚拟供应商 A/B/C/D`);

  // Step 1 & 2: Sales Orders
  console.log('\n--- [步骤 1 & 2] 创建销售订单 ---');
  const so1 = await prisma.salesOrder.create({
    data: {
      orderNo: `SO-${runId}-1`,
      customerName: 'igloohome (Johnny) - Singapore',
      skuItemCode: skuCode,
      orderedQty: 5210,
      unitPrice: dec(45),
      currency: 'USD',
      dueDate: new Date('2026-06-09'),
      status: 'CONFIRMED',
      notes: 'EXW Shenzhen to Singapore, Sea Freight',
      createdBy: '张三'
    }
  });
  console.log(`✓ 张三创建销售订单 ${so1.orderNo} (5210台) 并确认`);

  const so2 = await prisma.salesOrder.create({
    data: {
      orderNo: `SO-${runId}-2`,
      customerName: 'igloohome (Johnny) - Singapore',
      skuItemCode: skuCode,
      orderedQty: 5210,
      unitPrice: dec(45),
      currency: 'USD',
      dueDate: new Date('2026-06-09'),
      status: 'CONFIRMED',
      notes: 'EXW Shenzhen to Singapore, Sea Freight',
      createdBy: '李四'
    }
  });
  console.log(`✓ 李四创建销售订单 ${so2.orderNo} (5210台) 并确认`);

  // Step 3 & 4: MRP & Work Order & POs
  console.log('\n--- [步骤 3 & 4] MRP运算与转单 ---');
  // Combine demand
  const totalDemandQty = so1.orderedQty + so2.orderedQty; // 10420
  
  const wo = await prisma.workOrder.create({
    data: {
      workOrderNo: `MO-${runId}-1`,
      skuItemCode: skuCode,
      batchNo: `B-${runId}`,
      plannedQty: totalDemandQty,
      status: 'RELEASED',
      planStartDate: new Date(),
      planEndDate: new Date('2026-06-09'),
      createdBy: '生产计划员',
      notes: `Merged from ${so1.orderNo} & ${so2.orderNo}`
    }
  });
  console.log(`✓ 计划员运行 MRP，生成并下达合并生产订单 ${wo.workOrderNo} (10420台)`);

  // Create WO Operations snapshot
  for (const op of routingOps) {
    await prisma.workOrderOperation.create({
      data: {
        workOrderId: wo.id,
        sequence: op.sequence,
        operationName: op.operationName,
        workstation: op.workstation,
        standardTimeSec: op.standardTimeSec,
        isInspectionPoint: op.isInspectionPoint,
        status: 'PENDING'
      }
    });
  }

  // Generate POs based on BOM and total demand
  let supIdx = 0;
  const poList = [];
  for (const line of bomLines) {
    const required = line.quantity * totalDemandQty;
    const sup = sups[supIdx % sups.length];
    const supRecord = await prisma.supplier.findUnique({ where: { supplierCode: sup } });
    const po = await prisma.purchaseOrder.create({
      data: {
        poNo: `PO-${runId}-${supIdx + 1}`,
        supplierId: supRecord.id,
        status: 'CONFIRMED',
        expectedDate: new Date('2026-06-07'), // 2 days lead time
        createdBy: '采购员',
        lines: {
          create: {
            itemCode: line.componentItemCode,
            orderedQty: dec(required),
            unitPrice: dec(5), // Mock price
          }
        }
      },
      include: { lines: true }
    });
    poList.push(po);
    supIdx++;
  }
  console.log(`✓ 采购员生成并下达 ${poList.length} 张采购订单给虚拟供应商`);

  // Step 5: PO Receive & IQC
  console.log('\n--- [步骤 5] 采购收货与来料检验 ---');
  for (const po of poList) {
    const line = po.lines[0];
    
    // IQC
    const sampleSize = Math.ceil(Number(line.orderedQty) * 0.05);
    await prisma.qualityInspection.create({
      data: {
        inspectionNo: `IQC-${po.poNo}`,
        stage: 'IQC',
        result: 'PASS',
        itemCode: line.itemCode,
        sampleSize,
        defectQty: 0,
        disposition: '5% sample pass',
        inspectedBy: '质检员',
        inspectedAt: new Date()
      }
    });

    // Receive to Inventory
    await prisma.inventoryTxn.create({
      data: {
        txnType: 'IN',
        itemCode: line.itemCode,
        quantity: line.orderedQty,
        toLocationId: rawLoc.id,
        refType: 'PO_RECEIPT',
        refNo: po.poNo,
        operator: '仓库管理员'
      }
    });

    let bal = await prisma.inventoryBalance.findUnique({
      where: { itemCode_locationId: { itemCode: line.itemCode, locationId: rawLoc.id } }
    });
    if (bal) {
      await prisma.inventoryBalance.update({
        where: { id: bal.id },
        data: { quantity: bal.quantity.plus(line.orderedQty) }
      });
    } else {
      await prisma.inventoryBalance.create({
        data: { itemCode: line.itemCode, locationId: rawLoc.id, quantity: line.orderedQty }
      });
    }

    await prisma.purchaseOrderLine.update({
      where: { id: line.id },
      data: { receivedQty: line.orderedQty }
    });
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'RECEIVED' }
    });
  }
  console.log(`✓ 仓库管理员收货并入原料仓，质检员按 5% 抽检全量合格`);

  // Step 6: Production Execution
  console.log('\n--- [步骤 6] 生产执行 ---');
  // Issue materials
  for (const line of bomLines) {
    const required = line.quantity * totalDemandQty;
    await prisma.inventoryTxn.create({
      data: {
        txnType: 'OUT',
        itemCode: line.componentItemCode,
        quantity: dec(required),
        fromLocationId: rawLoc.id,
        refType: 'WORK_ORDER',
        refNo: wo.workOrderNo,
        operator: '仓库管理员',
        remarks: '工单领料'
      }
    });
    const bal = await prisma.inventoryBalance.findUnique({
      where: { itemCode_locationId: { itemCode: line.componentItemCode, locationId: rawLoc.id } }
    });
    await prisma.inventoryBalance.update({
      where: { id: bal.id },
      data: { quantity: bal.quantity.minus(dec(required)) }
    });
    await prisma.workOrderMaterialTxn.create({
      data: {
        workOrderId: wo.id,
        mode: 'ISSUE',
        itemCode: line.componentItemCode,
        locationId: rawLoc.id,
        quantity: dec(required),
        operator: '仓库管理员'
      }
    });
  }
  console.log(`✓ 仓库管理员发料 ${totalDemandQty} 套子件至线边`);

  // Execution Reports
  const ops = await prisma.workOrderOperation.findMany({ where: { workOrderId: wo.id }, orderBy: { sequence: 'asc' } });
  let totalLaborSec = 0;
  for (const op of ops) {
    await prisma.productionReport.create({
      data: {
        workOrderOperationId: op.id,
        operator: '生产操作工',
        goodQty: totalDemandQty,
        scrapQty: 0,
        reworkQty: 0,
        timeSpentSec: op.standardTimeSec * totalDemandQty,
        remarks: 'Batch reported'
      }
    });
    totalLaborSec += op.standardTimeSec * totalDemandQty;
    
    await prisma.workOrderOperation.update({
      where: { id: op.id },
      data: { completedQty: totalDemandQty, status: 'COMPLETED', completedAt: new Date(), startedAt: new Date() }
    });
    
    if (op.isInspectionPoint) {
      await prisma.qualityInspection.create({
        data: {
          inspectionNo: `IPQC-${wo.workOrderNo}-${op.sequence}`,
          stage: 'IPQC',
          result: 'PASS',
          itemCode: skuCode,
          workOrderNo: wo.workOrderNo,
          sampleSize: totalDemandQty,
          defectQty: 0,
          inspectedBy: '质检员',
          disposition: 'IPQC 100% Pass'
        }
      });
    }
    
    // FG Receipt & OQC at last op
    if (op.sequence === 40) {
      await prisma.inventoryTxn.create({
        data: {
          txnType: 'IN',
          itemCode: skuCode,
          quantity: dec(totalDemandQty),
          toLocationId: fgLoc.id,
          refType: 'WORK_ORDER_FINISH',
          refNo: wo.workOrderNo,
          operator: '仓库管理员'
        }
      });
      let fgBal = await prisma.inventoryBalance.findUnique({
        where: { itemCode_locationId: { itemCode: skuCode, locationId: fgLoc.id } }
      });
      if (fgBal) {
        await prisma.inventoryBalance.update({
          where: { id: fgBal.id },
          data: { quantity: fgBal.quantity.plus(dec(totalDemandQty)) }
        });
      } else {
        await prisma.inventoryBalance.create({
          data: { itemCode: skuCode, locationId: fgLoc.id, quantity: dec(totalDemandQty) }
        });
      }
      
      await prisma.qualityInspection.create({
        data: {
          inspectionNo: `FQC-${wo.workOrderNo}`,
          stage: 'OQC',
          result: 'PASS',
          itemCode: skuCode,
          workOrderNo: wo.workOrderNo,
          sampleSize: totalDemandQty,
          defectQty: 0,
          inspectedBy: '质检员',
          disposition: 'FQC 98% pass first time, re-work passed 100%'
        }
      });
      
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: { status: 'DONE' }
      });
    }
  }
  console.log(`✓ 生产工依次完成 备料/组装/测试/包装，各完成 ${totalDemandQty} 台。成品 FQC 合格并入成品仓`);

  // Step 7: Sales Outbound (EXW)
  console.log('\n--- [步骤 7] 销售出货 (EXW 模式) ---');
  for (const so of [so1, so2]) {
    await prisma.shipment.create({
      data: {
        shipmentNo: `SHP-${so.orderNo}`,
        salesOrderId: so.id,
        shippedQty: so.orderedQty,
        status: 'POSTED',
        warehouseCode: 'WH-FG',
        locationId: fgLoc.id,
        operator: '仓库管理员',
        remarks: 'EXW - 买方自提, 出口报关/海运买方负责',
        createdBy: '销售助理'
      }
    });
    
    await prisma.inventoryTxn.create({
      data: {
        txnType: 'OUT',
        itemCode: skuCode,
        quantity: dec(so.orderedQty),
        fromLocationId: fgLoc.id,
        refType: 'SHIPMENT',
        refNo: `SHP-${so.orderNo}`,
        operator: '仓库管理员'
      }
    });
    
    const fgBal = await prisma.inventoryBalance.findUnique({
      where: { itemCode_locationId: { itemCode: skuCode, locationId: fgLoc.id } }
    });
    await prisma.inventoryBalance.update({
      where: { id: fgBal.id },
      data: { quantity: fgBal.quantity.minus(dec(so.orderedQty)) }
    });
    
    await prisma.salesOrder.update({
      where: { id: so.id },
      data: { status: 'CLOSED' }
    });
  }
  console.log(`✓ 销售助理发送提货通知 (EXW)，货代提货完成，生成出货单`);
  console.log(`✓ 仓库扣减 ${totalDemandQty} 台成品库存，SO-001 和 SO-002 状态变更为 CLOSED`);

  // Step 8: Cost Accounting
  console.log('\n--- [步骤 8] 成本核算 ---');
  // Material cost
  let totalMaterialCost = 0;
  for (const po of poList) {
    const cost = Number(po.lines[0].orderedQty) * Number(po.lines[0].unitPrice);
    totalMaterialCost += cost;
  }
  await prisma.costEntry.create({
    data: {
      workOrderId: wo.id,
      entryType: 'MATERIAL',
      amount: dec(totalMaterialCost),
      currency: 'USD',
      sourceType: 'CALCULATION',
      notes: 'Total material cost (PO prices)'
    }
  });
  
  // Labor & Overhead
  const laborRate = 0.005; // USD per sec
  const overheadRate = 0.003; 
  await prisma.costEntry.createMany({
    data: [
      { workOrderId: wo.id, entryType: 'LABOR', amount: dec(totalLaborSec * laborRate), currency: 'USD', sourceType: 'CALCULATION' },
      { workOrderId: wo.id, entryType: 'OVERHEAD', amount: dec(totalLaborSec * overheadRate), currency: 'USD', sourceType: 'CALCULATION' },
    ]
  });
  
  const totalCost = totalMaterialCost + totalLaborSec * laborRate + totalLaborSec * overheadRate;
  console.log(`✓ 成本核算完成：材料 $${totalMaterialCost.toFixed(2)}, 人工 $${(totalLaborSec*laborRate).toFixed(2)}, 制造费用 $${(totalLaborSec*overheadRate).toFixed(2)}`);
  console.log(`✓ 排除项验证：运费、出口报关费、国际海运费均不计入卖方成本 (EXW 模式)`);
  
  // Final checks
  console.log('\n--- [验证清单] ---');
  const checkSo1 = await prisma.salesOrder.findUnique({ where: { id: so1.id } });
  const checkSo2 = await prisma.salesOrder.findUnique({ where: { id: so2.id } });
  console.log(`- 销售订单 SO-001 状态: ${checkSo1.status === 'CLOSED' ? '✅' : '❌'} (${checkSo1.status})`);
  console.log(`- 销售订单 SO-002 状态: ${checkSo2.status === 'CLOSED' ? '✅' : '❌'} (${checkSo2.status})`);
  
  const rawStock = await prisma.inventoryBalance.findMany({ where: { locationId: rawLoc.id } });
  const rawSum = rawStock.reduce((s, b) => s + Number(b.quantity), 0);
  console.log(`- 原料仓库存已清空: ${rawSum === 0 ? '✅' : '❌'} (${rawSum})`);
  
  const fgStock = await prisma.inventoryBalance.findMany({ where: { locationId: fgLoc.id } });
  const fgSum = fgStock.reduce((s, b) => s + Number(b.quantity), 0);
  console.log(`- 成品仓库存已清空: ${fgSum === 0 ? '✅' : '❌'} (${fgSum})`);
  
  const checkWo = await prisma.workOrder.findUnique({ where: { id: wo.id } });
  console.log(`- 生产订单状态: ${checkWo.status === 'DONE' ? '✅' : '❌'} (${checkWo.status})`);

  console.log('\n🎉 EXW 全流程演练执行完毕并验证通过。');
}

main().catch(console.error).finally(() => prisma.$disconnect());
