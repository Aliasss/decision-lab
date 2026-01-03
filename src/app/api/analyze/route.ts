import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisResult, AnalysisResponse } from '@/lib/types';

// MCP 룰 섹션 4: AI 출력 규칙 (JSON 계약)
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
- 성찰을 유도하는 질문 제시 (조언 아님)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "불안을 구조적으로 설명하는 2~3문장. 감정 위로 없이 구조만 설명",
  "drivers": [
    {
      "name": "불안 요인 명칭 (개념화된 이름)",
      "evidence": "사용자 텍스트에서 찾은 근거 요약"
    }
  ],
  "meta_question": "조언이 아닌 성찰 질문 1개. 행동 지시 금지",
  "disallowed_check": {
    "contains_advice": false,
    "contains_recommendation": false,
    "contains_rankings": false
  }
}

drivers는 3~5개 사이로 제한합니다.
JSON 외의 텍스트는 절대 포함하지 마세요.`;

// 안전 메시지 (JSON 파싱 실패 시)
const FALLBACK_RESULT: AnalysisResult = {
  summary: '입력하신 내용을 분석하는 데 어려움이 있었습니다. 다시 시도해 주세요.',
  drivers: [
    { name: '분석 불가', evidence: '텍스트를 다시 작성해 주세요.' }
  ],
  meta_question: '무엇이 가장 마음에 걸리나요?',
  disallowed_check: {
    contains_advice: false,
    contains_recommendation: false,
    contains_rankings: false
  }
};

// JSON 파싱 및 검증
function parseAndValidate(content: string): AnalysisResult | null {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;

    // 필수 필드 검증
    if (!parsed.summary || !parsed.drivers || !parsed.meta_question) {
      return null;
    }

    // drivers 개수 검증 (3~5개)
    if (parsed.drivers.length < 3 || parsed.drivers.length > 5) {
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
    let result: AnalysisResult | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (!result && retryCount < maxRetries) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
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
        result = parseAndValidate(content);
      }

      if (!result) {
        retryCount++;
      }
    }

    // 실패 시 안전 메시지 반환
    if (!result) {
      console.log('Using fallback result after retries');
      result = FALLBACK_RESULT;
    }

    // 로깅 (Vercel 로그에 기록됨)
    console.log('[Analysis]', {
      timestamp: new Date().toISOString(),
      textLength: text.length,
      driversCount: result.drivers.length,
    });

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

