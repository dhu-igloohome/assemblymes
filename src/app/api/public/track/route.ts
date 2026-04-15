import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';
    
    const { path, locale } = await request.json();

    // Silent record in database
    await prisma.visitorLog.create({
      data: {
        ip: ip.split(',')[0], // Take first IP if behind proxy
        userAgent,
        path: path || '/',
        locale: locale || 'en',
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently to not disturb user experience
    console.error('Tracking failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
