import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisResult, AnalysisResponse, AnxietyDriver } from '@/lib/types';

// ============================================
// 역할 태그 시스템 (v5)
// ============================================

// 역할 태그 키워드 매핑
const ROLE_TAG_KEYWORDS: Record<string, string[]> = {
  '현재를 붙잡게 만드는 힘': ['안정', '유지', '현재', '익숙', '편안', '지금'],
  '변화를 막는 힘': ['변화', '바꾸', '전환', '이동', '떠나'],
  '미래를 두렵게 만드는 힘': ['미래', '앞으로', '나중', '언젠가', '될지'],
  '결정을 미루게 만드는 힘': ['불확실', '모르', '확신', '보장', '예측'],
  '통제 욕구를 키우는 힘': ['통제', '관리', '컨트롤', '조절', '잡고'],
  '자기 평가를 흔드는 힘': ['정체성', '나라는', '자격', '능력', '가치'],
  '타인 시선에 묶이게 하는 힘': ['타인', '시선', '평가', '인정', '기대', '실망'],
  '과거에 붙잡히게 하는 힘': ['후회', '과거', '그때', '했었', '잘못'],
  '시도를 막는 힘': ['실패', '실수', '잃', '망하', '안되'],
  '현재를 부정하게 만드는 힘': ['비교', '남들', '다른 사람', '더 나은', '뒤처'],
};

// 기본 역할 태그
const DEFAULT_ROLE_TAG = '불안을 키우는 힘';

// driver.name에서 역할 태그 선택
function selectRoleTag(driverName: string): string {
  const lowerName = driverName.toLowerCase();

  for (const [tag, keywords] of Object.entries(ROLE_TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return tag;
      }
    }
  }

  return DEFAULT_ROLE_TAG;
}

// drivers에 역할 태그 추가
function addRoleTags(drivers: AnxietyDriver[]): AnxietyDriver[] {
  return drivers.map((driver) => ({
    ...driver,
    role: selectRoleTag(driver.name),
  }));
}

// ============================================
// meta_question 질문 타입 시스템 (v4)
// ============================================

// 질문 타입별 키워드 정의
const QUESTION_TYPE_KEYWORDS = {
  A: ['반복', '항상', '자주', '매번', '또다시', '미루', '되풀이', '같은 상황', '늘', '계속', '패턴', '습관'],
  B: ['불확실', '미래', '예측', '결과', '통제', '리스크', '가능성', '변수', '모르', '어떻게 될', '확신', '보장'],
  C: ['정체성', '증명', '후회', '타인', '시선', '실패', '평가', '의미', '나라는', '어떤 사람', '자격', '능력'],
};

// 질문 템플릿 정의 (재사용 유도용)
const QUESTION_TEMPLATES = {
  A: [
    '이 불안은 이전 결정들과 어떤 점에서 반복되고 있나요?',
    '과거에도 비슷한 선택 앞에서 같은 불안을 느낀 적이 있었나요?',
  ],
  B: [
    '이 결정에서 당신이 통제할 수 없는 요소는 무엇인가요?',
    '결과와 상관없이, 지금 당신이 붙잡고 있는 가정은 무엇인가요?',
  ],
  C: [
    '이 불안은 결과에 대한 걱정인가요, 아니면 당신 자신에 대한 평가인가요?',
    '이 선택이 당신을 어떤 사람으로 규정할까 봐 불안한가요?',
  ],
};

// drivers 기반으로 질문 타입 선택
function selectQuestionType(drivers: AnxietyDriver[]): 'A' | 'B' | 'C' {
  const scores = { A: 0, B: 0, C: 0 };

  // drivers의 name + evidence 텍스트에서 키워드 매칭
  const allText = drivers.map((d) => `${d.name} ${d.evidence}`).join(' ').toLowerCase();

  for (const [type, keywords] of Object.entries(QUESTION_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        scores[type as 'A' | 'B' | 'C']++;
      }
    }
  }

  // 가장 높은 점수의 타입 선택 (동점이면 A > B > C 우선순위)
  if (scores.A >= scores.B && scores.A >= scores.C) return 'A';
  if (scores.B >= scores.C) return 'B';
  return 'C';
}

// 질문 타입에서 템플릿 랜덤 선택
function selectMetaQuestion(drivers: AnxietyDriver[]): string {
  const type = selectQuestionType(drivers);
  const templates = QUESTION_TEMPLATES[type];
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

// ============================================
// AI 프롬프트 (v5: 제목 추상화 지시 추가)
// ============================================

const SYSTEM_PROMPT = `당신은 결정 직전 불안의 구조를 해석하는 도구입니다.

절대 하지 말아야 할 것:
- 조언 제공 금지
- 선택 추천 금지
- "나라면", "더 나은 선택" 같은 표현 금지
- 심리 상담, 치료, 진단 흉내 금지
- 행동 제안 금지
- 위로나 공감 표현 금지

해야 할 것:
- 사용자의 텍스트에서 불안의 구조를 분석
- 불안을 만드는 요인(드라이버)을 명명

중요: 드라이버 이름 작성 규칙
- 이번 상황 전용 표현이 아닌, 반복 가능한 개념으로 작성
- 예시: "이직에 대한 두려움" (X) → "변화에 대한 저항" (O)
- 예시: "연봉 협상 불안" (X) → "불확실성 회피" (O)
- 다른 결정 상황에서도 적용될 수 있는 추상적 개념으로 명명

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "불안을 구조적으로 설명하는 2~3문장. 감정 위로 없이 구조만 설명",
  "drivers": [
    {
      "name": "불안 요인 명칭 (반복 가능한 개념)",
      "evidence": "사용자 텍스트에서 찾은 근거 요약 (최소 12자 이상)"
    }
  ]
}

drivers는 3~5개 사이로 제한합니다.
각 evidence는 최소 12자 이상으로 작성합니다.
JSON 외의 텍스트는 절대 포함하지 마세요.`;

// AI 응답 파싱용 타입 (meta_question, role 없음 - 서버에서 추가)
interface AIResponse {
  summary: string;
  drivers: Array<{ name: string; evidence: string }>;
}

// 안전 메시지 (JSON 파싱 실패 시)
const FALLBACK_DRIVERS: AnxietyDriver[] = [
  { name: '분석 불가', evidence: '텍스트를 다시 작성해 주세요.', role: DEFAULT_ROLE_TAG },
  { name: '입력 재검토 필요', evidence: '더 구체적인 상황 설명이 필요합니다.', role: DEFAULT_ROLE_TAG },
  { name: '맥락 부족', evidence: '결정 상황에 대한 배경을 추가해 주세요.', role: DEFAULT_ROLE_TAG },
];

const FALLBACK_RESULT: AnalysisResult = {
  summary: '입력하신 내용을 분석하는 데 어려움이 있었습니다. 다시 시도해 주세요.',
  drivers: FALLBACK_DRIVERS,
  meta_question: selectMetaQuestion(FALLBACK_DRIVERS),
  disallowed_check: {
    contains_advice: false,
    contains_recommendation: false,
    contains_rankings: false,
  },
};

// 금지 패턴 목록 (조언/추천 탐지용)
const DISALLOWED_PATTERNS = [
  '추천',
  '나라면',
  '더 나은',
  '정답',
  '선택해',
  '하는 게 낫',
  '하는게 낫',
  '해야 합니다',
  '해야합니다',
  '하세요',
  '하시는 게',
  '하시는게',
  'A가 낫',
  'B가 낫',
  '좋을 것 같',
  '좋을것 같',
  '권합니다',
  '권해드립니다',
];

// 금지 패턴 탐지
function containsDisallowedPatterns(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DISALLOWED_PATTERNS.some((pattern) => lowerText.includes(pattern.toLowerCase()));
}

// JSON 파싱 및 검증 (AI는 summary + drivers만 반환)
function parseAndValidate(content: string): AIResponse | null {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AIResponse;

    // 필수 필드 검증
    if (!parsed.summary || !parsed.drivers) {
      return null;
    }

    // drivers 개수 검증 (3~5개)
    if (parsed.drivers.length < 3 || parsed.drivers.length > 5) {
      return null;
    }

    // evidence 길이 검증 (최소 12자)
    for (const driver of parsed.drivers) {
      if (!driver.evidence || driver.evidence.length < 12) {
        return null;
      }
    }

    // 금지 패턴 탐지 (summary)
    if (containsDisallowedPatterns(parsed.summary)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.length < 50) {
      return NextResponse.json<AnalysisResponse>(
        { success: false, error: '텍스트가 너무 짧습니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json<AnalysisResponse>(
        { success: false, error: 'API 설정 오류' },
        { status: 500 }
      );
    }

    // OpenAI API 호출
    let aiResponse: AIResponse | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (!aiResponse && retryCount < maxRetries) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        retryCount++;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        aiResponse = parseAndValidate(content);
      }

      if (!aiResponse) {
        retryCount++;
      }
    }

    // 최종 결과 조합
    let result: AnalysisResult;
    let isFallback = false;

    if (aiResponse) {
      // AI 응답 성공: drivers에 역할 태그 추가 + meta_question 선택
      const driversWithRoles = addRoleTags(aiResponse.drivers);
      const metaQuestion = selectMetaQuestion(driversWithRoles);
      result = {
        summary: aiResponse.summary,
        drivers: driversWithRoles,
        meta_question: metaQuestion,
        disallowed_check: {
          contains_advice: false,
          contains_recommendation: false,
          contains_rankings: false,
        },
      };
    } else {
      // AI 응답 실패: fallback 사용
      console.log('Using fallback result after retries');
      result = FALLBACK_RESULT;
      isFallback = true;
    }

    // 선택된 질문 타입 로깅
    const questionType = selectQuestionType(result.drivers);

    // 로깅 (Vercel 로그에 기록됨)
    console.log(
      JSON.stringify({
        type: 'analysis',
        ts: new Date().toISOString(),
        input_len: text.length,
        drivers_count: result.drivers.length,
        question_type: questionType,
        is_fallback: isFallback,
      })
    );

    return NextResponse.json<AnalysisResponse>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json<AnalysisResponse>(
      { success: false, error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
