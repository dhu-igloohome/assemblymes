import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type BomTreeNode = {
  id: string;
  componentItemCode: string;
  componentItemName: string;
  quantity: number;
  scrapRate: number;
  children: BomTreeNode[];
};

type BomDiffLine = {
  componentItemCode: string;
  componentItemName: string;
  changeType: 'added' | 'removed' | 'changed';
  fromQuantity: number | null;
  toQuantity: number | null;
  fromScrapRate: number | null;
  toScrapRate: number | null;
};

async function buildBomTree(
  parentItemCode: string,
  visited = new Set<string>()
): Promise<BomTreeNode[]> {
  if (visited.has(parentItemCode)) {
    return [];
  }

  const nextVisited = new Set(visited);
  nextVisited.add(parentItemCode);

  const bomHeader = await prisma.bomHeader.findFirst({
    where: { parentItemCode, isActive: true },
    include: {
      lines: {
        include: {
          componentItem: true,
        },
        orderBy: {
          componentItemCode: 'asc',
        },
      },
    },
  });

  if (!bomHeader) {
    return [];
  }

  return Promise.all(
    bomHeader.lines.map(async (line) => ({
      id: line.id,
      componentItemCode: line.componentItemCode,
      componentItemName: line.componentItem.itemName,
      quantity: Number(line.quantity),
      scrapRate: Number(line.scrapRate),
      children: await buildBomTree(line.componentItemCode, nextVisited),
    }))
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentItemCode = searchParams.get('parentItemCode');
    const version = searchParams.get('version');
    const mode = searchParams.get('mode');

    if (!parentItemCode) {
      if (mode === 'list') {
        const bomHeaders = await prisma.bomHeader.findMany({
          select: {
            id: true,
            parentItemCode: true,
            version: true,
            isActive: true,
            updatedAt: true,
            parentItem: {
              select: {
                itemName: true,
              },
            },
            _count: {
              select: {
                lines: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        });

        return NextResponse.json(bomHeaders);
      }

      return NextResponse.json({ error: 'parentItemCode is required' }, { status: 400 });
    }

    if (mode === 'versions') {
      const versions = await prisma.bomHeader.findMany({
        where: { parentItemCode },
        select: {
          id: true,
          version: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      return NextResponse.json(versions);
    }

    if (mode === 'tree') {
      const parentItem = await prisma.item.findUnique({
        where: { itemCode: parentItemCode },
        select: {
          itemCode: true,
          itemName: true,
        },
      });

      if (!parentItem) {
        return NextResponse.json({ error: 'Parent item not found' }, { status: 404 });
      }

      const tree = await buildBomTree(parentItemCode);
      return NextResponse.json({
        parentItemCode,
        parentItemName: parentItem.itemName,
        children: tree,
      });
    }

    if (mode === 'diff') {
      const compareVersion = searchParams.get('compareVersion');

      if (!version || !compareVersion) {
        return NextResponse.json(
          { error: 'version and compareVersion are required for diff mode' },
          { status: 400 }
        );
      }

      const [baseBom, compareBom] = await Promise.all([
        prisma.bomHeader.findUnique({
          where: {
            parentItemCode_version: {
              parentItemCode,
              version,
            },
          },
          include: {
            lines: {
              include: {
                componentItem: true,
              },
            },
          },
        }),
        prisma.bomHeader.findUnique({
          where: {
            parentItemCode_version: {
              parentItemCode,
              version: compareVersion,
            },
          },
          include: {
            lines: {
              include: {
                componentItem: true,
              },
            },
          },
        }),
      ]);

      if (!baseBom || !compareBom) {
        return NextResponse.json(
          { error: 'One or both BOM versions were not found.' },
          { status: 404 }
        );
      }

      const baseMap = new Map(
        baseBom.lines.map((line) => [
          line.componentItemCode,
          {
            componentItemName: line.componentItem.itemName,
            quantity: Number(line.quantity),
            scrapRate: Number(line.scrapRate),
          },
        ])
      );
      const compareMap = new Map(
        compareBom.lines.map((line) => [
          line.componentItemCode,
          {
            componentItemName: line.componentItem.itemName,
            quantity: Number(line.quantity),
            scrapRate: Number(line.scrapRate),
          },
        ])
      );

      const allCodes = Array.from(
        new Set([...baseMap.keys(), ...compareMap.keys()])
      ).sort();

      const diff: BomDiffLine[] = allCodes.flatMap((componentItemCode): BomDiffLine[] => {
        const baseLine = baseMap.get(componentItemCode);
        const compareLine = compareMap.get(componentItemCode);

        if (!baseLine && compareLine) {
          return [{
            componentItemCode,
            componentItemName: compareLine.componentItemName,
            changeType: 'added',
            fromQuantity: null,
            toQuantity: compareLine.quantity,
            fromScrapRate: null,
            toScrapRate: compareLine.scrapRate,
          }];
        }

        if (baseLine && !compareLine) {
          return [{
            componentItemCode,
            componentItemName: baseLine.componentItemName,
            changeType: 'removed',
            fromQuantity: baseLine.quantity,
            toQuantity: null,
            fromScrapRate: baseLine.scrapRate,
            toScrapRate: null,
          }];
        }

        if (
          baseLine &&
          compareLine &&
          (baseLine.quantity !== compareLine.quantity ||
            baseLine.scrapRate !== compareLine.scrapRate)
        ) {
          return [{
            componentItemCode,
            componentItemName: compareLine.componentItemName,
            changeType: 'changed',
            fromQuantity: baseLine.quantity,
            toQuantity: compareLine.quantity,
            fromScrapRate: baseLine.scrapRate,
            toScrapRate: compareLine.scrapRate,
          }];
        }

        return [];
      });

      return NextResponse.json({
        parentItemCode,
        baseVersion: version,
        compareVersion,
        diff,
      });
    }

    const bomHeader = await prisma.bomHeader.findFirst({
      where: version
        ? { parentItemCode, version }
        : { parentItemCode, isActive: true },
      include: {
        lines: {
          include: {
            componentItem: true,
          },
          orderBy: {
            componentItemCode: 'asc',
          },
        },
        parentItem: true,
      },
    });

    if (!bomHeader) {
      return NextResponse.json({ message: 'No BOM found for this item' }, { status: 404 });
    }

    return NextResponse.json(bomHeader);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentItemCode, version, lines } = body;

    if (!parentItemCode || !version || !Array.isArray(lines)) {
      return NextResponse.json(
        { error: 'parentItemCode, version, and lines are required' },
        { status: 400 }
      );
    }

    const existingVersion = await prisma.bomHeader.findUnique({
      where: {
        parentItemCode_version: {
          parentItemCode,
          version,
        },
      },
    });

    if (existingVersion) {
      return NextResponse.json(
        { error: 'BOM version already exists for this parent item.' },
        { status: 409 }
      );
    }

    const newBom = await prisma.$transaction(async (tx) => {
      await tx.bomHeader.updateMany({
        where: { parentItemCode },
        data: { isActive: false },
      });

      return tx.bomHeader.create({
        data: {
          parentItemCode,
          version,
          isActive: true,
          lines: {
            create: lines.map((line: { componentItemCode: string; quantity: number; scrapRate?: number }) => ({
              componentItemCode: line.componentItemCode,
              quantity: line.quantity,
              scrapRate: line.scrapRate || 0,
            })),
          },
        },
        include: {
          lines: {
            include: {
              componentItem: true,
            },
          },
          parentItem: true,
        },
      });
    });

    return NextResponse.json(newBom, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to create BOM', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parentItemCode =
      typeof body.parentItemCode === 'string' ? body.parentItemCode.trim() : '';
    const version = typeof body.version === 'string' ? body.version.trim() : '';

    if (!parentItemCode || !version) {
      return NextResponse.json(
        { error: 'parentItemCode and version are required' },
        { status: 400 }
      );
    }

    const targetBom = await prisma.bomHeader.findUnique({
      where: {
        parentItemCode_version: {
          parentItemCode,
          version,
        },
      },
      select: { id: true },
    });

    if (!targetBom) {
      return NextResponse.json({ error: 'BOM version not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.bomHeader.updateMany({
        where: { parentItemCode },
        data: { isActive: false },
      });

      await tx.bomHeader.update({
        where: {
          parentItemCode_version: {
            parentItemCode,
            version,
          },
        },
        data: { isActive: true },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to activate BOM version', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}