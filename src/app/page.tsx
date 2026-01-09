'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/events';
import { createSessionId, clearSessionId } from '@/lib/storage';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // 랜딩 페이지 진입 시 이전 세션 정리
    clearSessionId();
    logEvent('landing_view');
  }, []);

  const handleYes = () => {
    // '예' 클릭 시점에 세션 생성
    createSessionId();
    logEvent('landing_yes');
    router.push('/write');
  };

  const handleNo = () => {
    logEvent('landing_no');
    // 아니오를 누르면 아무 일도 일어나지 않음 (가설 검증용)
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-medium text-foreground mb-4">
          결정을 앞두고 느끼는 불안을, 구조로 정리해 보여주는 도구입니다.
        </h1>

        <p className="text-sm text-muted mb-12">
          조언이나 추천은 제공하지 않습니다.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleYes}
            className="w-full py-4 px-6 bg-accent text-white rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
          >
            예
          </button>

          <button
            onClick={handleNo}
            className="w-full py-4 px-6 bg-transparent border border-border text-foreground rounded-lg text-lg font-medium hover:bg-stone-100 transition-colors"
          >
            아니오
          </button>
        </div>
      </div>
    </main>
  );
}
