'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/events';
import { savePendingText, getPendingText } from '@/lib/storage';

const MIN_LENGTH = 200;
const MIN_SENTENCES = 3;

function countSentences(text: string): number {
  // 한국어/영어 문장 종결 패턴
  const sentences = text.split(/[.!?。]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

export default function WritePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    logEvent('write_view');
    // 이전에 작성 중이던 텍스트 복원
    const pending = getPendingText();
    if (pending) {
      setText(pending);
    }
  }, []);

  const charCount = text.length;
  const sentenceCount = countSentences(text);
  const isValid = charCount >= MIN_LENGTH || sentenceCount >= MIN_SENTENCES;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    savePendingText(newText);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    logEvent('submit', { textLength: charCount, sentenceCount });

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
    } catch (error) {
      console.error('분석 오류:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-xl font-medium text-foreground mb-2">
          지금 당신의 결정 상황을 자유롭게 적어주세요
        </h1>
        <p className="text-muted text-sm mb-6">
          최소 3문장 또는 200자 이상
        </p>

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

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`py-3 px-8 rounded-lg text-base font-medium transition-all ${
              isValid && !isSubmitting
                ? 'bg-accent text-white hover:opacity-90'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '분석 중...' : '분석하기'}
          </button>
        </div>
      </div>
    </main>
  );
}

