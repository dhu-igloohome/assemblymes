import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, parseSessionCookieValue } from '@/lib/auth';
import { cookies } from 'next/headers';
import { simulateExternalSync, SyncSystem } from '@/lib/services/external-sync';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await parseSessionCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { system, entityType, entityId } = body;

    const result = await simulateExternalSync(system as SyncSystem, entityType, entityId, session.username);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SYNC_FAILED' },
      { status: 500 }
    );
  }
}
