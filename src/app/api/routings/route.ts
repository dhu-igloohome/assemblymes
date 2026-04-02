import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');
    const mode = searchParams.get('mode');

    if (!itemCode) {
      if (mode === 'suggestions') {
        const [operationNames, workstations] = await Promise.all([
          prisma.routingOperation.findMany({
            where: {
              operationName: {
                not: '',
              },
            },
            select: {
              operationName: true,
            },
            distinct: ['operationName'],
            orderBy: {
              operationName: 'asc',
            },
            take: 200,
          }),
          prisma.routingOperation.findMany({
            where: {
              workstation: {
                not: '',
              },
            },
            select: {
              workstation: true,
            },
            distinct: ['workstation'],
            orderBy: {
              workstation: 'asc',
            },
            take: 200,
          }),
        ]);

        return NextResponse.json({
          operationNames: operationNames.map((entry) => entry.operationName),
          workstations: workstations.map((entry) => entry.workstation),
        });
      }

      if (mode === 'list') {
        const routings = await prisma.routingHeader.findMany({
          select: {
            id: true,
            itemCode: true,
            version: true,
            effectiveDate: true,
            changeNote: true,
            createdBy: true,
            updatedAt: true,
            item: {
              select: {
                itemName: true,
              },
            },
            _count: {
              select: {
                operations: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        });

        return NextResponse.json(routings);
      }

      return NextResponse.json({ error: 'itemCode is required' }, { status: 400 });
    }

    const routing = await prisma.routingHeader.findFirst({
      where: { itemCode },
      include: {
        operations: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!routing) {
      return NextResponse.json({ message: 'No Routing found for this item' }, { status: 404 });
    }

    return NextResponse.json(routing);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Routing' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, version, operations, effectiveDate, changeNote, createdBy } = body;

    if (typeof itemCode !== 'string' || !/^\d{6}$/.test(itemCode.trim())) {
      return NextResponse.json({ error: 'ITEM_CODE_INVALID' }, { status: 400 });
    }
    if (typeof version !== 'string' || version.trim() === '') {
      return NextResponse.json({ error: 'VERSION_REQUIRED' }, { status: 400 });
    }
    if (!Array.isArray(operations)) {
      return NextResponse.json({ error: 'OPERATIONS_INVALID' }, { status: 400 });
    }

    const normalizedItemCode = itemCode.trim();
    const normalizedVersion = version.trim();
    const normalizedOps = operations.map((op: unknown) => {
      const record = (op && typeof op === 'object' ? (op as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;

      return {
      sequence:
        typeof record.sequence === 'number' || typeof record.sequence === 'string'
          ? Number(record.sequence)
          : 0,
      operationName: typeof record.operationName === 'string' ? record.operationName.trim() : '',
      workstation: typeof record.workstation === 'string' ? record.workstation.trim() : '',
      standardTimeSec:
        typeof record.standardTimeSec === 'number' || typeof record.standardTimeSec === 'string'
          ? Number(record.standardTimeSec)
          : 0,
      isInspectionPoint: Boolean(record.isInspectionPoint),
      inspectionStandard:
        typeof record.inspectionStandard === 'string' && record.inspectionStandard.trim() !== ''
          ? record.inspectionStandard.trim()
          : null,
      };
    });

    const workstationCodes = Array.from(
      new Set(
        normalizedOps
          .map((op) => op.workstation.trim())
          .filter((value) => value.length > 0)
      )
    );

    if (workstationCodes.length > 0) {
      const matched = await prisma.workCenter.findMany({
        where: {
          workCenterCode: { in: workstationCodes },
        },
        select: { workCenterCode: true },
      });
      const matchedSet = new Set(matched.map((row) => row.workCenterCode));
      const invalidCodes = workstationCodes.filter((code) => !matchedSet.has(code));
      if (invalidCodes.length > 0) {
        return NextResponse.json(
          {
            error: 'WORKSTATION_NOT_FOUND',
            details: invalidCodes.join(','),
          },
          { status: 400 }
        );
      }
    }

    try {
      const created = await prisma.routingHeader.create({
        data: {
          itemCode: normalizedItemCode,
          version: normalizedVersion,
          effectiveDate:
            typeof effectiveDate === 'string' && effectiveDate.trim() !== ''
              ? new Date(effectiveDate)
              : null,
          changeNote:
            typeof changeNote === 'string' && changeNote.trim() !== ''
              ? changeNote.trim()
              : null,
          createdBy:
            typeof createdBy === 'string' && createdBy.trim() !== ''
              ? createdBy.trim()
              : null,
          operations: {
            create: normalizedOps,
          },
        },
        include: { operations: true },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
      // If the same itemCode+version already exists, treat POST as "overwrite this version".
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const updated = await prisma.$transaction(async (tx) => {
          const header = await tx.routingHeader.update({
            where: {
              itemCode_version: {
                itemCode: normalizedItemCode,
                version: normalizedVersion,
              },
            },
            data: {
              effectiveDate:
                typeof effectiveDate === 'string' && effectiveDate.trim() !== ''
                  ? new Date(effectiveDate)
                  : null,
              changeNote:
                typeof changeNote === 'string' && changeNote.trim() !== ''
                  ? changeNote.trim()
                  : null,
              createdBy:
                typeof createdBy === 'string' && createdBy.trim() !== ''
                  ? createdBy.trim()
                  : null,
            },
            select: { id: true },
          });

          await tx.routingOperation.deleteMany({
            where: { routingHeaderId: header.id },
          });

          await tx.routingOperation.createMany({
            data: normalizedOps.map((op) => ({
              routingHeaderId: header.id,
              sequence: op.sequence,
              operationName: op.operationName,
              workstation: op.workstation,
              standardTimeSec: op.standardTimeSec,
              isInspectionPoint: op.isInspectionPoint,
              inspectionStandard: op.inspectionStandard,
            })),
          });

          return tx.routingHeader.findUnique({
            where: {
              itemCode_version: {
                itemCode: normalizedItemCode,
                version: normalizedVersion,
              },
            },
            include: {
              operations: { orderBy: { sequence: 'asc' } },
            },
          });
        });

        return NextResponse.json(updated, { status: 200 });
      }
      throw error;
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'ROUTING_SAVE_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}