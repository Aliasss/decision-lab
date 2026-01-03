// 로컬스토리지 기반 사용자 식별 및 사용 추적
// MCP 룰 섹션 6: 데이터 저장 원칙

const STORAGE_KEYS = {
  PSEUDO_USER_ID: 'decision_lab_user_id',
  USAGE_COUNT: 'decision_lab_usage_count',
  LAST_USED: 'decision_lab_last_used',
  CURRENT_SESSION: 'decision_lab_current_session',
  PENDING_TEXT: 'decision_lab_pending_text',
} as const;

// UUID v4 생성
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 사용자 ID 가져오기 (없으면 생성)
export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  
  let userId = localStorage.getItem(STORAGE_KEYS.PSEUDO_USER_ID);
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.PSEUDO_USER_ID, userId);
  }
  return userId;
}

// 세션 ID 생성
export function createSessionId(): string {
  const sessionId = generateUUID();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionId);
  }
  return sessionId;
}

// 현재 세션 ID 가져오기
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION) || createSessionId();
}

// 사용 횟수 증가
export function incrementUsageCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const current = parseInt(localStorage.getItem(STORAGE_KEYS.USAGE_COUNT) || '0', 10);
  const newCount = current + 1;
  localStorage.setItem(STORAGE_KEYS.USAGE_COUNT, String(newCount));
  localStorage.setItem(STORAGE_KEYS.LAST_USED, new Date().toISOString());
  return newCount;
}

// 사용 횟수 가져오기
export function getUsageCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(STORAGE_KEYS.USAGE_COUNT) || '0', 10);
}

// 마지막 사용 시점 가져오기
export function getLastUsed(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.LAST_USED);
}

// 입력 텍스트 임시 저장 (페이지 이동 시 유지용)
export function savePendingText(text: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PENDING_TEXT, text);
}

// 임시 저장된 텍스트 가져오기
export function getPendingText(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.PENDING_TEXT) || '';
}

// 임시 텍스트 삭제
export function clearPendingText(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PENDING_TEXT);
}

