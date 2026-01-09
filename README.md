# Decision Lab

결정 직전 불안 구조 해석 가설 검증용 MVP

## 프로젝트 목적

> "결정 직전 불안 상황에서 구조 설명이라는 개입이 재사용 행동을 만들어내는가"를 검증한다.

이 프로젝트는 **서비스 완성이 아닌 가설 검증**이 목적입니다.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 OpenAI API 키를 추가합니다:

```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

## 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 - "지금 결정을 앞두고 있나요?" |
| `/write` | 자유 서술 입력 (최소 3문장 또는 200자) |
| `/result` | 불안 구조 분석 결과 + 피드백 |

## 기술 스택

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (gpt-4o-mini)
- 로컬스토리지 (사용자 식별)
- Vercel (배포 + 로깅)

## 배포

Vercel에 배포 후 환경 변수 `OPENAI_API_KEY`를 설정하세요.

```bash
vercel
```

## MCP 룰

`.cursorrules` 파일에 프로젝트 운영 규칙이 정의되어 있습니다.
