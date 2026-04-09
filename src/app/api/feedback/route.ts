import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionCookieValue, AUTH_COOKIE_NAME, SUPER_ADMIN_ROLE } from '@/lib/auth';
import { cookies } from 'next/headers';

// 访客提交留言（公开接口）
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

    // 尝试获取 IP，但在某些环境下可能获取不到
    let ip = 'unknown';
    try {
      ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    } catch (e) {
      console.warn('Could not get IP:', e);
    }

    // 写入数据库
    const feedback = await prisma.visitorFeedback.create({
      data: {
        content,
        nickname: nickname || null,
        contact: contact || null,
        ip,
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error: any) {
    console.error('CRITICAL: Feedback POST error:', error);
    return NextResponse.json({ 
      error: 'SUBMISSION_FAILED', 
      details: error?.message || 'Unknown database error' 
    }, { status: 500 });
  }
}

// 管理员查看留言（受限接口）
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'NO_SESSION' }, { status: 401 });
    }

    const session = await parseSessionCookieValue(sessionToken);

    if (!session || session.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json({ 
        error: 'NOT_AUTHORIZED_AS_ADMIN',
        currentRole: session?.role || 'NONE'
      }, { status: 403 });
    }

    const feedbacks = await prisma.visitorFeedback.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(feedbacks);
  } catch (error: any) {
    console.error('Fetch feedback error:', error);
    return NextResponse.json({ error: 'FAILED_TO_FETCH', details: error?.message }, { status: 500 });
  }
}
