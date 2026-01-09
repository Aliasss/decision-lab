import { NextRequest, NextResponse } from 'next/server';

// MCP 룰 섹션 6: 서버 (Vercel API 로그)
// 이벤트는 Vercel 로그에 한 줄 JSON으로 기록됨

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Vercel 로그에 한 줄 JSON으로 이벤트 기록
    console.log(JSON.stringify(payload));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'event_error', error: String(error) }));
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
