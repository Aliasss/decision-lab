'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/events';
import { incrementUsageCount, clearPendingText, hasSessionId } from '@/lib/storage';
import type { AnalysisResult, RoleCategory } from '@/lib/types';

// v7: roleCategory를 라벨로 매핑 (UI에서만 사용)
const ROLE_LABELS: Record<RoleCategory, string> = {
  amplify: '불안을 증폭시키는 장치',
  sustain: '불안을 지속시키는 장치',
  fixate: '불안을 고착시키는 장치',
};

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [helpfulAnswer, setHelpfulAnswer] = useState<boolean | null>(null);
  const [reuseAnswer, setReuseAnswer] = useState<boolean | null>(null);

  useEffect(() => {
    // 세션 ID 없으면 랜딩으로 리다이렉트
    if (!hasSessionId()) {
      router.push('/');
      return;
    }

    // 세션 스토리지에서 결과 가져오기
    const stored = sessionStorage.getItem('analysis_result');
    if (!stored) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed.success && parsed.data) {
        setResult(parsed.data);
        logEvent('result_view', { drivers_count: parsed.data.drivers?.length || 0 });
        incrementUsageCount();
        clearPendingText();
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  const handleHelpful = (value: boolean) => {
    setHelpfulAnswer(value);
    logEvent('feedback_helpful', { helpful: value ? 'Y' : 'N' });
  };

  const handleReuse = (value: boolean) => {
    setReuseAnswer(value);
    logEvent('feedback_reuse', { reuse_intent: value ? 'Y' : 'N' });
  };

  const handleNewAnalysis = () => {
    sessionStorage.removeItem('analysis_result');
    router.push('/');
  };

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* 상단 안내 문구 */}
        <p className="text-sm text-muted mb-8 text-center">
          이 도구는 결정을 대신하지 않고, 불안을 만드는 구조만 정리합니다.
        </p>

        {/* 섹션 1: 불안 구조 요약 */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-muted mb-3 uppercase tracking-wide">
            불안 구조 요약
          </h2>
          <p className="text-lg text-foreground leading-relaxed">{result.summary}</p>
        </section>

        {/* 섹션 2: 불안 드라이버 분해 */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-muted mb-4 uppercase tracking-wide">
            불안 드라이버
          </h2>
          <div className="space-y-4">
            {result.drivers.map((driver, index) => (
              <div
                key={index}
                className="p-4 border border-border rounded-lg bg-white break-words"
                style={{ overflowWrap: 'anywhere' }}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="font-medium text-foreground">{driver.name}</h3>
                  {driver.roleCategory && (
                    <span className="text-xs text-muted">({ROLE_LABELS[driver.roleCategory]})</span>
                  )}
                </div>
                <p className="text-sm text-muted">{driver.evidence}</p>
              </div>
            ))}
          </div>
          {/* 재사용 암시 문구 */}
          <p className="text-xs text-muted mt-4">
            비슷한 결정 상황에서도, 이 불안 드라이버는 다시 나타날 수 있습니다.
          </p>
        </section>

        {/* 섹션 3: 메타 질문 */}
        <section className="mb-12 p-6 bg-slate-100 rounded-lg">
          {/* 연결 암시 문구 */}
          <p className="text-xs text-muted mb-3">
            위의 불안 드라이버 중 하나에서 이어진 질문입니다.
          </p>
          <h2 className="text-sm font-medium text-muted mb-3 uppercase tracking-wide">
            생각해볼 질문
          </h2>
          <p className="text-lg text-foreground font-medium">{result.meta_question}</p>
          <p className="text-xs text-muted mt-4">
            비슷한 결정 앞에서도, 이 질문은 다시 사용할 수 있습니다.
          </p>
          {result.linked_driver && (
            <p className="text-xs text-muted/60 mt-2">
              — {result.linked_driver}
            </p>
          )}
        </section>

        {/* 피드백 질문 */}
        <section className="border-t border-border pt-8 space-y-6">
          {/* 도움 여부 */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-foreground">이 설명이 도움이 되었나요?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleHelpful(true)}
                disabled={helpfulAnswer !== null}
                className={`min-h-[44px] min-w-[44px] py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  helpfulAnswer === true
                    ? 'bg-accent text-white'
                    : helpfulAnswer === null
                      ? 'bg-white border border-border hover:bg-slate-50'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                예
              </button>
              <button
                onClick={() => handleHelpful(false)}
                disabled={helpfulAnswer !== null}
                className={`min-h-[44px] min-w-[44px] py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  helpfulAnswer === false
                    ? 'bg-accent text-white'
                    : helpfulAnswer === null
                      ? 'bg-white border border-border hover:bg-slate-50'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                아니오
              </button>
            </div>
          </div>

          {/* 재사용 의향 */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-foreground">다음 결정에서도 다시 쓰고 싶나요?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleReuse(true)}
                disabled={reuseAnswer !== null}
                className={`min-h-[44px] min-w-[44px] py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  reuseAnswer === true
                    ? 'bg-accent text-white'
                    : reuseAnswer === null
                      ? 'bg-white border border-border hover:bg-slate-50'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                예
              </button>
              <button
                onClick={() => handleReuse(false)}
                disabled={reuseAnswer !== null}
                className={`min-h-[44px] min-w-[44px] py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  reuseAnswer === false
                    ? 'bg-accent text-white'
                    : reuseAnswer === null
                      ? 'bg-white border border-border hover:bg-slate-50'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                아니오
              </button>
            </div>
          </div>
        </section>

        {/* 새 분석 버튼 */}
        <div className="mt-12 text-center">
          <button
            onClick={handleNewAnalysis}
            className="text-muted hover:text-foreground underline text-sm transition-colors"
          >
            새로운 결정 분석하기
          </button>
        </div>
      </div>
    </main>
  );
}
