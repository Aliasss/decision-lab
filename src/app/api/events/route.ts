import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// MCP 룰 섹션 6: 서버 이벤트 로그
// Vercel KV에 저장 + Vercel 로그에도 기록

interface EventPayload {
  session_id: string;
  pseudo_user_id?: string;
  event_name: string;
  page?: string;
  // 이벤트별 추가 데이터
  input_len?: number;
  sentence_count?: number;
  input_hash?: string;
  drivers_count?: number;
  drivers_summary?: Array<{ name: string; roleCategory: string }>;
  meta_question?: string;
  helpful?: 'Y' | 'N';
  reuse?: 'Y' | 'N';
}

export async function POST(request: NextRequest) {
  try {
    const payload: EventPayload = await request.json();

    // timestamp 추가
    const timestamp = new Date().toISOString();
    const eventRecord = {
      ...payload,
      timestamp,
    };

    // Vercel 로그에 한 줄 JSON으로 기록 (항상)
    console.log(JSON.stringify(eventRecord));

    // Vercel KV에 저장 시도 (환경 변수가 설정된 경우만)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        // 키 패턴: events:{session_id}:{timestamp}
        const key = `events:${payload.session_id}:${timestamp}`;
        
        // 30일 후 자동 만료 (TTL: 30 * 24 * 60 * 60 = 2592000초)
        await kv.set(key, JSON.stringify(eventRecord), { ex: 2592000 });
      } catch (kvError) {
        // KV 저장 실패해도 API는 성공으로 처리 (로그에만 기록)
        console.error(JSON.stringify({ 
          type: 'kv_error', 
          error: String(kvError),
          session_id: payload.session_id 
        }));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'event_error', error: String(error) }));
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
