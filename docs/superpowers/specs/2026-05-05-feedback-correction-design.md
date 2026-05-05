# Feedback Correction System — Design

- **Date**: 2026-05-05
- **Status**: Approved, ready for implementation plan
- **Goal**: 👎 피드백 시 사용자가 "실제 등급"을 입력하도록 하여 프롬프트 튜닝용 정답 라벨 데이터를 수집한다.

## Background

현재 결과 카드의 피드백 버튼은 👍/👎 두 가지 시그널만 수집한다 (`shots.feedback` text 컬럼, `up | down | null`). 이 시그널만으로는 프롬프트 개선에 한계가 있다 — "AI가 틀렸다"는 알지만 "정답이 무엇인지"는 모른다. `prompt_version`과 `user_correction`을 함께 기록해 어느 버전의 프롬프트가 어떤 종류의 오류를 만들었는지 추적할 수 있게 한다.

## Architecture & Data Flow

```
[1] 사용자 사진 분석
     │
     ▼
POST /api/analyze
     요청: { image, mimeType }
     응답: AnalysisResult & { prompt_version: "v1" }   ← stamp
     │
     ▼
프론트(main-shot-flow): analysis + promptVersion state 보관

[2] "히스토리에 저장" 클릭
     │
     ▼
saveShotToHistory({ base64, mimeType, analysis, promptVersion })
     INSERT shots(..., prompt_version, feedback=null, user_correction=null)
     ▼
shotId 반환

[3] 👍 클릭
     ▼
updateShotFeedback(shotId, "up", null)
     UPDATE feedback="up", user_correction=NULL
     ▼
끝

[3'] 👎 클릭 (correction 없는 상태)
     ▼
updateShotFeedback(shotId, "down")     ← 즉시 down 저장 (correction 미터치)
     │
     ▼
Drawer 열림: A/B/C/D/F 등급 + note 입력
     │
     ├─ 제출
     │     ▼
     │  updateShotFeedback(shotId, "down", { expected_grade, note })
     │     UPDATE user_correction = jsonb
     │     ▼
     │  sonner toast "피드백 감사합니다 🙏"
     │
     └─ Drag-down / 외부 탭 dismiss
           ▼
        DB 호출 없음 (down은 이미 저장됨, correction=null로 남음)
```

**핵심 원칙:**

- `updateShotFeedback`이 모든 피드백 상태 변경의 단일 진입점
- Server action은 dumb overwrite (toggle 판단은 프론트가 함)
- `correction` 인자가 `undefined` → 컬럼 미터치, `null` → 명시적 NULL, object → 저장
- `FeedbackButtons` 컴포넌트는 main flow + history detail page 양쪽에서 동일하게 동작

## Database Schema (`shotgrade.shots`)

`docs/supabase-schema.sql`에 추가 (idempotent ALTER):

```sql
alter table shotgrade.shots
  add column if not exists user_correction jsonb default null;

alter table shotgrade.shots
  add column if not exists prompt_version text default 'v1';

create index if not exists idx_shots_prompt_version
  on shotgrade.shots (prompt_version);
```

- `user_correction` jsonb 예시: `{ "expected_grade": "D", "note": "크레마 거의 없었음" }`
- `prompt_version` 기본값 `'v1'` → 기존 row 자동 백필
- RLS: 기존 row-level 정책이 새 컬럼도 자동 커버 (변경 불필요)

## Type Definitions (`lib/types.ts`)

```typescript
export type UserCorrection = {
  expected_grade: Grade  // "A" | "B" | "C" | "D" | "F"
  note?: string
}

export type AnalyzeResponseBody = AnalysisResult & {
  prompt_version: string
}

export type ShotRow = {
  // ...기존 필드
  user_correction: UserCorrection | null
  prompt_version: string | null  // 옛 row 호환
}
```

## Constants (`lib/prompts.ts`)

```typescript
export const PROMPT_VERSION = "v1" as const
// 프롬프트 수정 시마다 v2, v3... 으로 bump
```

## Server Action Signatures

### `updateShotFeedback` (`app/actions/feedback.ts`)

```typescript
export async function updateShotFeedback(
  shotId: string,
  feedback: "up" | "down" | null,
  correction?: UserCorrection | null
): Promise<{ ok: true } | { ok: false; message: string }>
```

| `feedback` | `correction` | DB 동작 |
|---|---|---|
| `"up"` \| `"down"` | `undefined` | `feedback` 컬럼만 UPDATE, `user_correction` 미터치 |
| `"up"` \| `"down"` | `null` | `feedback` 업데이트 + `user_correction` → NULL |
| `"up"` \| `"down"` | `{...}` | `feedback` 업데이트 + `user_correction` → jsonb |
| `null` | `null` | `feedback` → NULL + `user_correction` → NULL (토글 오프) |

### `saveShotToHistory` (`app/actions/save-shot.ts`)

```typescript
export async function saveShotToHistory(payload: {
  base64: string
  mimeType: string
  analysis: AnalysisResult
  promptVersion: string  // ← 추가
}): Promise<{ ok: true; shotId: string } | { ok: false; message: string }>
```

INSERT 시 `prompt_version: payload.promptVersion` 추가.

## Frontend Toggle Logic (in `FeedbackButtons`)

| 현재 `feedback` | 클릭 | 호출 |
|---|---|---|
| `null` | 👍 | `updateShotFeedback(id, "up", null)` |
| `null` | 👎 | `updateShotFeedback(id, "down")` → Drawer 오픈 |
| `"up"` | 👍 | `updateShotFeedback(id, null, null)` (토글 오프) |
| `"up"` | 👎 | `updateShotFeedback(id, "down")` → Drawer 오픈 |
| `"down"` | 👍 | `updateShotFeedback(id, "up", null)` (correction 초기화) |
| `"down"` | 👎 | DB 호출 없음, Drawer만 다시 오픈 (correction pre-fill) |

Drawer 제출: `updateShotFeedback(id, "down", { expected_grade, note })` + 토스트.
Drawer dismiss: DB 호출 없음.

## UI Components

### Drawer 레이아웃 (모바일 퍼스트)

```
┌─────────────────────────────────┐
│         ━━━━  (drag handle)     │
│   실제 등급은?                   │
│                                  │
│  [A]  [B]  [C]  [D]  [F]        │  ← 등급별 컬러, h-14
│                                  │
│   한마디 (선택)                  │
│  ┌────────────────────────────┐ │
│  │ 예: 크레마 거의 없었음     │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │           제출              │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

### Grade 버튼 디자인

기존 `lib/grade-colors.ts` 컬러 재사용:
- A `#22c55e` / B `#84cc16` / C `#eab308` / D `#f97316` / F `#ef4444`
- 미선택: 외곽선 + 등급 컬러 텍스트
- 선택: 등급 컬러 배경 + 흰 텍스트 + `scale-105`
- min-height `h-14` (모바일 thumb 영역)
- Grid 5열, equal width

### Drawer 동작 규칙

| 상황 | 동작 |
|---|---|
| 첫 오픈 (correction 없음) | grade 미선택, note 빈 칸, 제출 disabled |
| 재오픈 (correction 있음) | 기존 grade 활성, note pre-fill, 제출 활성 |
| Grade 선택 시 | 제출 버튼 활성화 |
| 제출 성공 | 닫힘 + sonner 토스트 |
| 제출 실패 | 안 닫힘, 인라인 에러 |
| Drag-down / 외부 탭 dismiss | DB 호출 없음 |

### CorrectionDrawer 컴포넌트 시그니처

```typescript
type CorrectionDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCorrection: UserCorrection | null
  onSubmit: (correction: UserCorrection) => Promise<{ ok: boolean; message?: string }>
}
```

### FeedbackButtons 변경 후 props

```typescript
type FeedbackButtonsProps = {
  shotId: string | null | undefined
  initialFeedback?: "up" | "down" | null
  initialCorrection?: UserCorrection | null  // ← 추가
}
```

## File Changes

| # | 파일 | 변경 종류 | 핵심 |
|---|---|---|---|
| 1 | `docs/supabase-schema.sql` | 추가 | `add column if not exists` 두 줄 + index |
| 2 | `lib/prompts.ts` | 추가 | `PROMPT_VERSION` 상수 |
| 3 | `lib/types.ts` | 추가 | `UserCorrection`, `AnalyzeResponseBody`, `ShotRow` 확장 |
| 4 | `app/api/analyze/route.ts` | 수정 | 응답에 `prompt_version` stamp |
| 5 | `app/actions/feedback.ts` | 수정 | 시그니처 확장, undefined/null 분기 |
| 6 | `app/actions/save-shot.ts` | 수정 | `promptVersion` 인자, INSERT 확장 |
| 7 | `components/ui/drawer.tsx` | 신설 | `npx shadcn add drawer` |
| 8 | `components/ui/sonner.tsx` | 신설 | `npx shadcn add sonner` |
| 9 | `app/layout.tsx` | 수정 | `<Toaster />` 마운트 |
| 10 | `components/correction-drawer.tsx` | 신설 | Drawer 본체 |
| 11 | `components/feedback-buttons.tsx` | 수정 | toggle 로직 + drawer 통합 + props 확장 |
| 12 | `components/grade-card.tsx` | 수정 | `userCorrection` pass-through |
| 13 | `components/main-shot-flow.tsx` | 수정 | `promptVersion` state, save에 전달, `userCorrection` state |
| 14 | `app/history/[id]/page.tsx` | 수정 | SELECT 확장, prop 전달 |

총 14개 파일 (신설 4 + 수정 10).

## Implementation Order

**Phase 0 — 사용자 사전 작업 (코드 외)**
- Supabase Dashboard SQL editor에서 `docs/supabase-schema.sql`의 새 ALTER 두 줄 실행
- 이 단계 없이 진행하면 INSERT 시 컬럼 미존재 에러

**Phase 1 — Foundation**
1. `docs/supabase-schema.sql` ALTER 추가
2. `lib/prompts.ts` `PROMPT_VERSION`
3. `lib/types.ts` 타입 추가/확장

**Phase 2 — Backend**
4. `app/api/analyze/route.ts` prompt_version stamp
5. `app/actions/save-shot.ts` 시그니처 + INSERT 확장
6. `app/actions/feedback.ts` 시그니처 + correction 분기

**Phase 3 — UI primitives**
7. `npx shadcn add drawer sonner` (자동 생성)
8. `app/layout.tsx` Toaster 마운트

**Phase 4 — 도메인 컴포넌트**
9. `components/correction-drawer.tsx` 신설
10. `components/feedback-buttons.tsx` drawer 통합 + toggle
11. `components/grade-card.tsx` prop pass-through
12. `components/main-shot-flow.tsx` state 추가
13. `app/history/[id]/page.tsx` DB select + prop 전달

**Phase 5 — 검증**
14. `npx tsc --noEmit`
15. `npx eslint .`
16. 수동 테스트 시나리오:
    - 분석 → 저장 → 👍 → 토글 → 👎 → drawer → grade 선택 → 제출 → 토스트 확인
    - 👎 → drawer dismiss → DB에 down만 남는지
    - 다시 👎 → drawer pre-fill 되는지
    - 👎 후 👍 → correction 초기화 되는지
    - History 페이지에서 동일 동작 가능한지

## Out of Scope

- 테스트 코드 작성 (프로젝트 테스트 인프라 없음)
- prompt v2 자동 bump (사용자 수동)
- 데이터 분석 쿼리/대시보드 (별도 작업)
- Notion 정의서 동기화 (사용자 수동)

## Risks

- **Phase 0 누락 시 저장 500 에러** — 사용자 안내 필수
- **`shadcn add` 인터넷 필요** — 로컬 개발 시 한 번만 실행, Vercel build와 무관
- 옛 row들은 `user_correction=null`, `prompt_version='v1'` 자동 백필 (default 덕분)
