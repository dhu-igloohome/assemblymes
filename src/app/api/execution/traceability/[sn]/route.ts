import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ sn: string }> }
) {
  try {
    const { sn } = await context.params;

    // 1. Fetch the primary execution task or record
    const task = await prisma.assemblyExecutionTask.findUnique({
      where: { serialNo: sn },
    });

    if (!task) {
      return NextResponse.json({ error: 'SN_NOT_FOUND' }, { status: 404 });
    }

    // 2. Fetch associated Work Order & Operations history
    const workOrder = await prisma.workOrder.findFirst({
      where: { batchNo: task.batchNo, skuItemCode: task.skuItemCode },
      include: {
        operations: {
          orderBy: { sequence: 'asc' },
          include: {
            productionReports: {
              where: { remarks: { contains: sn } } // Simple linkage logic
            }
          }
        }
      }
    });

    // 3. Fetch Quality Inspection results
    const inspections = await prisma.qualityInspection.findMany({
      where: { 
        OR: [
          { batchNo: task.batchNo },
          { itemCode: task.skuItemCode }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Construct Digital DNA Tree
    const dna = {
      identity: {
        sn: task.serialNo,
        btId: task.bluetoothId,
        sku: task.skuItemCode,
        batch: task.batchNo,
        bornAt: task.createdAt
      },
      process: workOrder?.operations.map(op => ({
        id: op.id,
        name: op.operationName,
        station: op.workstation,
        status: op.completedQty > 0 ? 'COMPLETED' : 'PENDING',
        reports: op.productionReports
      })) || [],
      quality: inspections.map(i => ({
        id: i.id,
        stage: i.stage,
        result: i.result,
        inspector: i.inspectedBy,
        time: i.inspectedAt
      })),
      materials: [
        { name: 'PCBA Mainboard', batch: `LOT-${task.batchNo}-01`, provider: 'Internal SMT' },
        { name: 'Battery Cell', batch: 'BATT-202404-X', provider: 'Supplier-A' },
        { name: 'Aluminum Shell', batch: 'SHELL-V2', provider: 'Supplier-B' }
      ] // Mocked recursive BOM for now
    };

    return NextResponse.json(dna);
  } catch (error) {
    return NextResponse.json({ error: 'TRACE_FAILED' }, { status: 500 });
  }
}
