---
id: ARCH-ShotGrade
date: 2026-05-02
status: accepted
tags: [architecture]
---

# Architecture — ShotGrade

## 기술 스택
- Framework: Next.js 16 (App Router, TypeScript)
- Styling: Tailwind CSS 4 + shadcn/ui
- DB/Auth/Storage: Supabase Pro (PostgreSQL, `shotgrade` schema)
- AI: Anthropic Claude Vision API (claude-sonnet-4-20250514)
- Deploy: Vercel (Hobby)
- PWA: next-pwa or 수동 manifest.json

## 핵심 데이터 흐름
```
[Mobile Camera] → 클라이언트 리사이즈(1024px)

→ Base64 POST /api/analyze

→ Supabase Auth 검증

→ Claude Vision API (structured JSON)

→ JSON 파싱 + DB 저장 (shotgrade.shots)

→ 클라이언트 grade-card 렌더링
```

## API 라우트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/analyze | 이미지 → AI 분석 → 등급 반환 + DB 저장 |
| GET | /auth/callback | Supabase OAuth 리디렉트 처리 |

## 서비스 레이어
- `lib/prompts.ts` — Vision API 프롬프트 (핵심, 신중 수정)
- `lib/analyze.ts` — 분석 로직 + JSON 파싱 가드
- `lib/image-utils.ts` — 클라이언트 이미지 리사이즈/압축
- `lib/supabase/client.ts` — 브라우저 Supabase 클라이언트
- `lib/supabase/server.ts` — 서버사이드 Supabase 클라이언트
- `lib/supabase/db.ts` — schema: shotgrade 분리

## 컴포넌트 구조
- `camera-capture.tsx` — 카메라/갤러리 입력
- `grade-card.tsx` — 등급 결과 카드 (A~F 색상별)
- `feedback-buttons.tsx` — 👍👎 피드백
- `shot-history-list.tsx` — 히스토리 리스트
- `main-shot-flow.tsx` — 메인 촬영→분석 플로우
- `auth-button.tsx` — Google OAuth 토글

## DB 스키마
- Schema: `shotgrade` (Supabase Exposed schemas에 추가 필수)
- Table: `shotgrade.shots`
  - id (UUID PK), user_id (FK auth.users), image_url, grade (A~F),
    score (0~100), analysis (JSONB), feedback ('up'|'down'),
    user_correction (JSONB, 예정), prompt_version (text, 예정),
    created_at (timestamptz)
- RLS: SELECT/INSERT/UPDATE/DELETE — auth.uid() = user_id
- Storage: `shot-images` 버킷 (private, signed URL)

## 제약 조건
- Vercel Hobby: 10초 타임아웃, 4.5MB 페이로드 제한
- Anthropic API 비용: Sonnet 기준 ~$0.01/분석
- 클라이언트 리사이즈 필수 (서버 부하 최소화)
