// 이벤트 로깅 시스템
// MCP 룰 섹션 6: 서버 (Vercel API 로그)

import { getUserId, getSessionId } from './storage';

export type EventType =
  | 'landing_view'
  | 'landing_yes'
  | 'landing_no'
  | 'write_view'
  | 'submit'
  | 'result_view'
  | 'feedback_helpful'
  | 'feedback_reuse';

interface EventPayload {
  event: EventType;
  ts: string;
  pseudo_user_id: string;
  session_id: string;
  path: string;
  data?: Record<string, unknown>;
}

// 이벤트 로깅 (서버로 전송)
export async function logEvent(
  event: EventType,
  data?: Record<string, unknown>
): Promise<void> {
  const payload: EventPayload = {
    event,
    ts: new Date().toISOString(),
    pseudo_user_id: getUserId(),
    session_id: getSessionId(),
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    data,
  };

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('[Event]', JSON.stringify(payload));
  }

  // 서버로 이벤트 전송
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // 이벤트 로깅 실패는 사용자 경험에 영향을 주지 않음
    console.error('[Event Error]', error);
  }
}
