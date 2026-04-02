import { NextResponse } from 'next/server';
import { getCurrentTenantSubscription } from '@/lib/tenant-subscription';

export async function GET() {
  try {
    const info = await getCurrentTenantSubscription();
    if (!info) {
      return NextResponse.json({ error: 'SUBSCRIPTION_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'SUBSCRIPTION_LOAD_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

