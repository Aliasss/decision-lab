import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisResult, AnalysisResponse, AnxietyDriver, RoleCategory } from '@/lib/types';

// ============================================
// 역할 카테고리 시스템 (v7: 키워드 점수 기반)
// ============================================

// 카테고리별 키워드 (점수 기반 매칭용)
const CATEGORY_KEYWORDS: Record<RoleCategory, string[]> = {
  amplify: ['실수', '위협', '급박', '공포', '폭발', '과대', '증폭', '커지', '확대', '실패', '잘못', '부족', '비교', '뒤처'],
  sustain: ['책임', '의무', '해야', '준비', '완벽', '유지', '붙잡', '놓지', '통제', '관리', '미루', '보장', '확신'],
  fixate: ['평가', '자존', '정체성', '인정', '시선', '능력', '자격', '증명', '타인', '기대', '실망', '나라는', '어떤 사람'],
};

// 기본값: sustain (가장 무난)
const DEFAULT_CATEGORY: RoleCategory = 'sustain';

// 키워드 점수 기반 roleCategory 판정 (index 기반 금지)
function assignRoleCategory(driverName: string, evidence: string): RoleCategory {
  const text = `${driverName} ${evidence}`.toLowerCase();
  
  const scores: Record<RoleCategory, number> = {
    amplify: 0,
    sustain: 0,
    fixate: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[category as RoleCategory]++;
      }
    }
  }

  // 최고점 카테고리 선택, 동점이면 sustain
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return DEFAULT_CATEGORY;
  
  if (scores.amplify === maxScore) return 'amplify';
  if (scores.fixate === maxScore) return 'fixate';
  return 'sustain'; // 동점 또는 sustain 최고점
}

// drivers 전체에 roleCategory 적용 + 전부 sustain일 때만 보정
function addRoleCategories(drivers: AnxietyDriver[]): AnxietyDriver[] {
  const result = drivers.map((driver) => ({
    ...driver,
    roleCategory: assignRoleCategory(driver.name, driver.evidence),
  }));

  // 전부 sustain이면 첫 번째만 amplify로 보정
  const allSustain = result.every((d) => d.roleCategory === 'sustain');
  if (allSustain && result.length > 0) {
    result[0].roleCategory = 'amplify';
  }

  return result;
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

// 질문 타입에서 템플릿 랜덤 선택 + 연결된 드라이버 반환
function selectMetaQuestionWithDriver(drivers: AnxietyDriver[]): { question: string; linkedDriver: string } {
  const scores: Record<'A' | 'B' | 'C', { total: number; bestDriver: string; bestScore: number }> = {
    A: { total: 0, bestDriver: '', bestScore: 0 },
    B: { total: 0, bestDriver: '', bestScore: 0 },
    C: { total: 0, bestDriver: '', bestScore: 0 },
  };

  // 각 driver별로 타입 점수 계산
  for (const driver of drivers) {
    const driverText = `${driver.name} ${driver.evidence}`.toLowerCase();
    
    for (const [type, keywords] of Object.entries(QUESTION_TYPE_KEYWORDS)) {
      let driverScore = 0;
      for (const keyword of keywords) {
        if (driverText.includes(keyword.toLowerCase())) {
          driverScore++;
        }
      }
      
      const t = type as 'A' | 'B' | 'C';
      scores[t].total += driverScore;
      
      // 이 타입에서 가장 높은 점수의 driver 추적
      if (driverScore > scores[t].bestScore) {
        scores[t].bestScore = driverScore;
        scores[t].bestDriver = driver.name;
      }
    }
  }

  // 가장 높은 총점의 타입 선택
  let selectedType: 'A' | 'B' | 'C' = 'A';
  if (scores.A.total >= scores.B.total && scores.A.total >= scores.C.total) {
    selectedType = 'A';
  } else if (scores.B.total >= scores.C.total) {
    selectedType = 'B';
  } else {
    selectedType = 'C';
  }

  const templates = QUESTION_TEMPLATES[selectedType];
  const randomIndex = Math.floor(Math.random() * templates.length);
  
  // linkedDriver가 없으면 첫 번째 driver 사용
  const linkedDriver = scores[selectedType].bestDriver || drivers[0]?.name || '';

  return {
    question: templates[randomIndex],
    linkedDriver,
  };
}

// 기존 호환용 (selectQuestionType 유지)
function selectMetaQuestion(drivers: AnxietyDriver[]): string {
  return selectMetaQuestionWithDriver(drivers).question;
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

중요: evidence 작성 규칙 (시점 일반화)
- "당신은", "사용자는" 직접 지칭 금지
- "상황 조건 → 반응 구조" 형태로 작성
- 조건 표현 필수: "~할 때", "~상황에서", "~경우", "~느낄 때", "~앞에서"
- 반응 표현 필수: "~하게 된다", "~경향이 있다", "~커진다", "~나타난다"
- 좋은 예시: "성과나 평가가 중요한 상황에서, 스스로를 과하게 의심하게 되는 경향이 나타난다"
- 좋은 예시: "신뢰를 잃을 수 있다고 느낄 때, 책임을 혼자 떠안는 방향으로 움직이게 된다"
- 나쁜 예시: "너무 멍청하고 바보 같다고 느끼는 순간들이 많아지고 있다" (직접 지칭)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "불안을 구조적으로 설명하는 2~3문장. 감정 위로 없이 구조만 설명",
  "drivers": [
    {
      "name": "불안 요인 명칭 (반복 가능한 개념)",
      "evidence": "상황 조건 → 반응 구조 형태로 작성 (최소 12자 이상)"
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
  { name: '분석 불가', evidence: '텍스트를 다시 작성해 주세요.', roleCategory: 'amplify' },
  { name: '입력 재검토 필요', evidence: '더 구체적인 상황 설명이 필요합니다.', roleCategory: 'sustain' },
  { name: '맥락 부족', evidence: '결정 상황에 대한 배경을 추가해 주세요.', roleCategory: 'sustain' },
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
      // AI 응답 성공: drivers에 roleCategory 추가 + meta_question + linked_driver 선택
      const driversWithCategories = addRoleCategories(aiResponse.drivers);
      const { question: metaQuestion, linkedDriver } = selectMetaQuestionWithDriver(driversWithCategories);
      result = {
        summary: aiResponse.summary,
        drivers: driversWithCategories,
        meta_question: metaQuestion,
        linked_driver: linkedDriver,
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
