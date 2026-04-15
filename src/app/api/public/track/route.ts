import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';
    
    // Vercel Edge Geo-Location Headers
    const country = headerList.get('x-vercel-ip-country') || 'unknown';
    const region = headerList.get('x-vercel-ip-country-region') || 'unknown';
    
    const { path, locale } = await request.json();

    // Silent record in database
    await prisma.visitorLog.create({
      data: {
        ip: ip.split(',')[0],
        userAgent,
        path: path || '/',
        locale: locale || 'en',
        country,
        region,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
