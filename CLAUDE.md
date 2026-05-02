@AGENTS.md

# ShotGrade

에스프레소 샷 사진 → AI 등급(A~F) + 조절 가이드 PWA.

> **단일 진실의 원천:** Notion 정의서 `ShotGrade — 프로젝트 정의서 & 바이브코딩 가이드` (`ec90c0371dd74f8590ba74857c6238bf`). 정의서와 코드가 어긋나면 정의서를 먼저 확인하고, 의도된 변경이라면 정의서도 함께 갱신한다.

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Auth, DB, Storage)
- Anthropic Claude Vision API (`claude-opus-4-7`, `lib/prompts.ts`의 `ANALYSIS_MODEL` 참고 — Opus 4.7은 Sonnet 대비 약 5배 비용이므로 무제한 플랜 마진 모니터링 필요)
- Vercel 배포

## Key Files

- `lib/prompts.ts` — Vision API 프롬프트 (핵심, 신중하게 수정)
- `app/api/analyze/route.ts` — 분석 API
- `components/grade-card.tsx` — 등급 결과 UI
- `lib/supabase/client.ts` — 브라우저 Supabase 클라이언트

## Conventions

- 한국어 UI (버튼, 안내문, 분석 결과)
- 다크 모드 우선 디자인 (`html`에 `dark` 클래스)
- 모바일 퍼스트 (PWA `public/manifest.json`)
- 컴포넌트는 shadcn/ui 기반
- API 키는 서버사이드만 (`ANTHROPIC_API_KEY`에 `NEXT_PUBLIC` 붙이지 말 것)
- 이미지는 클라이언트에서 리사이즈 후 Base64로 전송 (max 1024px, `lib/image-utils.ts`)

## DB: Supabase

- Postgres 스키마 **`shotgrade`** 안에 `shots` 테이블 (`docs/supabase-schema.sql`). 같은 프로젝트에서 다른 앱은 `public` 등으로 분리.
- 클라이언트는 `lib/supabase/db.ts`의 `db.schema: shotgrade` 로 고정.
- 대시보드 **Settings → API → Exposed schemas** 에 `shotgrade` 추가 필요.
- RLS: 유저는 자기 행만 CRUD
- Storage: `shot-images` 버킷은 프로젝트 공용 (스키마와 무관)

## 환경변수 (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` — 서버 전용. `NEXT_PUBLIC_` 접두사 절대 금지.
- `NEXT_PUBLIC_MAX_FREE_SHOTS_PER_DAY=1` — Free 티어 일일 한도(선택, 기본 1).

## Grade Colors

- A: `#22c55e`
- B: `#84cc16`
- C: `#eab308`
- D: `#f97316`
- F: `#ef4444`

## Multi-tool workflow

- 레인 분담: `docs/ai-tools-playbook.md`
- 모든 작업 종료 시 `docs/work-logs/YYYY-MM-DD.md`에 항목 append.
- Vision 프롬프트는 `docs/vision-prompt-draft.md`에서 합의한 뒤 `lib/prompts.ts`로 이전.
