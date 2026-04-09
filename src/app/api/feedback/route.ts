import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: 'SUBMISSION_FAILED' }, { status: 500 });
  }
}

export async function GET() {
  // Only allow public access to see recent feedback count or something simple?
  // For now, let's just keep GET restricted or simple.
  try {
    const count = await prisma.visitorFeedback.count();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
