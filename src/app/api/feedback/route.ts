import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionCookieValue, AUTH_COOKIE_NAME, SUPER_ADMIN_ROLE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    
    if (!content) {
      return NextResponse.json({ error: 'CONTENT_REQUIRED' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'CONTENT_TOO_LONG' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const feedback = await prisma.visitorFeedback.create({
      data: {
        content,
        nickname: nickname || null,
        contact: contact || null,
        ip,
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
    } catch (error) {
    console.error('Feedback submission error detail:', error);
    return NextResponse.json({ error: 'SUBMISSION_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie');
    const sessionCookie = cookie?.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const session = parseSessionCookieValue(sessionCookie?.split('=')[1]);

    if (!session || session.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const feedbacks = await prisma.visitorFeedback.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Fetch feedback error:', error);
    return NextResponse.json({ error: 'FAILED_TO_FETCH' }, { status: 500 });
  }
}
