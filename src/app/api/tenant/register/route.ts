import { NextResponse } from 'next/server';
import { getCurrentSessionUser, ensureTenantForUser } from '@/lib/tenant-subscription';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const tenantName = typeof body.tenantName === 'string' ? body.tenantName.trim() : '';
    const tenant = await ensureTenantForUser(session.username, tenantName || undefined);

    return NextResponse.json(
      {
        id: tenant.id,
        tenantCode: tenant.tenantCode,
        name: tenant.name,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'TENANT_REGISTER_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}

