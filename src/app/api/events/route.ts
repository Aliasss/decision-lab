import { NextRequest, NextResponse } from 'next/server';

// MCP 룰 섹션 6: 서버 (Vercel API 로그)
// 이벤트는 Vercel 로그에 기록됨

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Vercel 로그에 이벤트 기록
    console.log('[Event Log]', JSON.stringify({
      ...payload,
      serverTimestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Event Error]', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

