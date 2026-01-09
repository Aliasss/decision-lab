// MCP 룰 섹션 4: AI 출력 규칙 (JSON 계약)

export interface AnxietyDriver {
  name: string;
  evidence: string;
  role?: string; // v5: 역할 태그 (서버에서 추가)
}

export interface DisallowedCheck {
  contains_advice: boolean;
  contains_recommendation: boolean;
  contains_rankings: boolean;
}

export interface AnalysisResult {
  summary: string;
  drivers: AnxietyDriver[];
  meta_question: string;
  disallowed_check: DisallowedCheck;
}

// API 응답 타입
export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}
