// MCP 룰 섹션 4: AI 출력 규칙 (JSON 계약)

// v7: roleCategory만 저장, role(라벨)은 UI에서 매핑
export type RoleCategory = 'amplify' | 'sustain' | 'fixate';

export interface AnxietyDriver {
  name: string;
  evidence: string;
  roleCategory?: RoleCategory; // v7: 키워드 점수 기반 판정
}

export interface DisallowedCheck {
  contains_advice: boolean;
  contains_recommendation: boolean;
  contains_rankings: boolean;
}

export interface AnalysisResult {
  summary: string;
  drivers: AnxietyDriver[];
  structure_flow: string; // v7.3: 드라이버들이 동시에 작동할 때의 상태 설명 (3~4문장)
  meta_question: string;
  linked_driver?: string; // v7: 질문과 연결된 드라이버명 (exact match)
  disallowed_check: DisallowedCheck;
}

// API 응답 타입
export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}
