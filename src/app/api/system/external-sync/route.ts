import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { system } = await request.json();
    
    // Simulate industrial delay
    await new Promise(res => setTimeout(res, 2000));

    // Create Audit Log for Integration Activity
    const syncDetails = {
      timestamp: new Date().toISOString(),
      system,
      status: 'SUCCESS',
      recordsSynced: Math.floor(Math.random() * 50) + 1,
      payloadSize: `${(Math.random() * 500).toFixed(2)} KB`
    };

    await prisma.auditLog.create({
      data: {
        action: `SYNC_${system.toUpperCase()}`,
        entity: 'EXTERNAL_INTEGRATION',
        entityId: `SYS-${system.toUpperCase()}-${Date.now()}`,
        operator: session.username,
        details: JSON.stringify(syncDetails)
      }
    });

    return NextResponse.json({ success: true, details: syncDetails });
  } catch (error) {
    return NextResponse.json({ error: 'SYNC_FAILED' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const syncLogs = await prisma.auditLog.findMany({
      where: { entity: 'EXTERNAL_INTEGRATION' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    return NextResponse.json(syncLogs);
  } catch (error) {
    return NextResponse.json([]);
  }
}
