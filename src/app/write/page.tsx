'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/events';
import { savePendingText, getPendingText, hasSessionId } from '@/lib/storage';

const MIN_LENGTH = 200;
const MIN_SENTENCES = 3;

function countSentences(text: string): number {
  // 한국어/영어 문장 종결 패턴
  const sentences = text.split(/[.!?。]+/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

// 로딩 스피너 컴포넌트
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function WritePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 세션 ID 없으면 랜딩으로 리다이렉트
    if (!hasSessionId()) {
      router.push('/');
      return;
    }

    logEvent('write_view');
    // 이전에 작성 중이던 텍스트 복원
    const pending = getPendingText();
    if (pending) {
      setText(pending);
    }
  }, [router]);

  const charCount = text.length;
  const sentenceCount = countSentences(text);
  const isValid = charCount >= MIN_LENGTH || sentenceCount >= MIN_SENTENCES;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    savePendingText(newText);
    // 입력 시 에러 초기화
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    logEvent('submit', { input_len: charCount, sentence_count: sentenceCount });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const result = await response.json();

      // 결과를 세션 스토리지에 저장 (페이지 이동용)
      sessionStorage.setItem('analysis_result', JSON.stringify(result));

      router.push('/result');
    } catch (err) {
      console.error('분석 오류:', err);
      setError('분석 중 문제가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-xl font-medium text-foreground mb-2">
          지금 당신의 결정 상황을 자유롭게 적어주세요
        </h1>
        <p className="text-muted text-sm mb-6">최소 3문장 또는 200자 이상</p>

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="어떤 결정을 앞두고 있나요? 무엇이 고민되나요? 자유롭게 적어주세요..."
          className="w-full h-64 p-4 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-foreground bg-white"
          disabled={isSubmitting}
        />

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted">
            {charCount}자 · {sentenceCount}문장
          </span>

          {error ? (
            <button
              onClick={handleSubmit}
              className="py-3 px-8 rounded-lg text-base font-medium bg-accent text-white hover:opacity-90 transition-all"
            >
              재시도
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className={`py-3 px-8 rounded-lg text-base font-medium transition-all flex items-center gap-2 ${
                isValid && !isSubmitting
                  ? 'bg-accent text-white hover:opacity-90'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span>불안을 구조로 분해하는 중...</span>
                </>
              ) : (
                '분석하기'
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 text-right">{error}</p>
        )}
      </div>
    </main>
  );
}
