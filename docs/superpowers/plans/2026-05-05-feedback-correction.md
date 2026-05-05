# Feedback Correction System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture "actual grade" + optional note when user clicks 👎, persist as `user_correction` jsonb alongside `prompt_version`, to build a labeled training dataset for prompt tuning.

**Architecture:** Server Actions (no new REST routes). `updateShotFeedback` becomes a single dumb-overwrite entry point with `(shotId, feedback, correction?)` signature. 👎 click immediately saves `feedback="down"` (preserves current behavior) then opens a shadcn Drawer (vaul) for the correction. `prompt_version` is stamped by `/api/analyze` on the response and threaded through frontend state into `saveShotToHistory`. Sonner toast on success.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + Auth), shadcn/ui (button + card existing; drawer + sonner to add), Tailwind, vaul, sonner.

**Spec:** `docs/superpowers/specs/2026-05-05-feedback-correction-design.md`

**Project conventions to follow:**
- Korean UI strings
- Dark mode first (`html.dark`)
- Mobile-first PWA
- API keys server-only
- Supabase schema is `shotgrade` (not `public`)
- Verification = `npx tsc --noEmit` + `npx eslint .` + manual test (no automated test infra exists)
- Commit per task with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `docs/supabase-schema.sql` | Modify | Schema source of truth — add 2 columns + 1 index |
| `lib/prompts.ts` | Modify | Add `PROMPT_VERSION` constant |
| `lib/types.ts` | Modify | `UserCorrection`, `AnalyzeResponseBody`; extend `ShotRow` |
| `app/api/analyze/route.ts` | Modify | Stamp `prompt_version` on response |
| `app/actions/save-shot.ts` | Modify | Accept `promptVersion`; INSERT it |
| `app/actions/feedback.ts` | Modify | Extend signature; handle 3-state correction (undefined/null/object) |
| `components/ui/drawer.tsx` | Create (CLI) | shadcn primitive — `npx shadcn add drawer` |
| `components/ui/sonner.tsx` | Create (CLI) | shadcn Toaster wrapper — `npx shadcn add sonner` |
| `app/layout.tsx` | Modify | Mount `<Toaster />` |
| `components/correction-drawer.tsx` | Create | Drawer body — 5 grade buttons + note + submit |
| `components/feedback-buttons.tsx` | Modify | Toggle logic, drawer integration, props extension |
| `components/grade-card.tsx` | Modify | Pass `userCorrection` through to FeedbackButtons |
| `components/main-shot-flow.tsx` | Modify | `promptVersion` state, pass to save action; `userCorrection` state |
| `app/history/[id]/page.tsx` | Modify | SELECT `user_correction, prompt_version`; pass to GradeCard |

---

## Task 1: Schema migration (file + manual SQL run)

**Files:**
- Modify: `docs/supabase-schema.sql`
- Manual: Supabase Dashboard SQL editor

- [ ] **Step 1: Append ALTER + index to `docs/supabase-schema.sql`**

Append after the existing `grant ... to authenticated;` line (around line 41), before the storage comment:

```sql

-- Feedback correction (added 2026-05-05) ─ collect labeled training data
alter table shotgrade.shots
  add column if not exists user_correction jsonb default null;

alter table shotgrade.shots
  add column if not exists prompt_version text default 'v1';

create index if not exists idx_shots_prompt_version
  on shotgrade.shots (prompt_version);
```

- [ ] **Step 2: User runs the new SQL on Supabase**

Tell the user to open Supabase Dashboard → SQL Editor → paste this and run:

```sql
alter table shotgrade.shots
  add column if not exists user_correction jsonb default null;

alter table shotgrade.shots
  add column if not exists prompt_version text default 'v1';

create index if not exists idx_shots_prompt_version
  on shotgrade.shots (prompt_version);
```

Existing rows will be backfilled with `user_correction=NULL` and `prompt_version='v1'` automatically.

- [ ] **Step 3: Verify migration in Supabase**

In SQL editor, run:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'shotgrade' and table_name = 'shots'
order by ordinal_position;
```

Expected: rows include `user_correction | jsonb | NULL` and `prompt_version | text | 'v1'::text`.

- [ ] **Step 4: Commit schema doc change**

```bash
git add docs/supabase-schema.sql
git commit -m "$(cat <<'EOF'
Add user_correction and prompt_version columns to shots schema

Foundation for feedback correction feature: user_correction stores
{ expected_grade, note } when 👎 + drawer submit; prompt_version stamps
which prompt produced the analysis (for tuning regression analysis).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `PROMPT_VERSION` constant

**Files:**
- Modify: `lib/prompts.ts`

- [ ] **Step 1: Append constant to `lib/prompts.ts`**

After the existing `MAX_TOKENS = 1024` line, add:

```typescript
export const PROMPT_VERSION = "v1" as const
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts
git commit -m "$(cat <<'EOF'
Add PROMPT_VERSION constant for analysis result stamping

Bump v1 → v2... whenever SHOT_ANALYSIS_PROMPT changes meaningfully so
shots.prompt_version reflects which version produced each analysis.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extend types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `UserCorrection`, `AnalyzeResponseBody`; extend `ShotRow`**

Edit `lib/types.ts`. Add after the existing `Grade` type:

```typescript
export type UserCorrection = {
  expected_grade: Grade
  note?: string
}
```

Add after `AnalysisResult` definition:

```typescript
export type AnalyzeResponseBody = AnalysisResult & {
  prompt_version: string
}
```

Modify `ShotRow` type (existing) to add two fields:

```typescript
export type ShotRow = {
  id: string
  user_id: string
  image_url: string
  grade: Grade
  score: number
  analysis: AnalysisResult
  feedback: "up" | "down" | null
  user_correction: UserCorrection | null
  prompt_version: string | null
  created_at: string
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "$(cat <<'EOF'
Add UserCorrection, AnalyzeResponseBody types; extend ShotRow

UserCorrection: { expected_grade, note? } for 👎 drawer submissions.
AnalyzeResponseBody composes AnalysisResult with prompt_version stamp.
ShotRow gains the two new columns matching the schema migration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Stamp `prompt_version` on `/api/analyze` response

**Files:**
- Modify: `app/api/analyze/route.ts`

- [ ] **Step 1: Import `PROMPT_VERSION` and stamp on response**

Edit `app/api/analyze/route.ts`. Update the import:

```typescript
import {
  ANALYSIS_MODEL,
  MAX_TOKENS,
  PROMPT_VERSION,
  SHOT_ANALYSIS_PROMPT,
} from "@/lib/prompts"
```

Find this block (currently around line 86-88):

```typescript
    try {
      const analysis = parseAnalysisJson(raw)
      return NextResponse.json(analysis)
    } catch (parseErr) {
```

Replace with:

```typescript
    try {
      const analysis = parseAnalysisJson(raw)
      return NextResponse.json({ ...analysis, prompt_version: PROMPT_VERSION })
    } catch (parseErr) {
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "$(cat <<'EOF'
Stamp prompt_version on /api/analyze response

The frontend threads this value into saveShotToHistory so each shot row
records which prompt version produced it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Extend `saveShotToHistory` with `promptVersion`

**Files:**
- Modify: `app/actions/save-shot.ts`

- [ ] **Step 1: Add `promptVersion` to payload + INSERT**

Edit `app/actions/save-shot.ts`. Modify the function signature:

```typescript
export async function saveShotToHistory(payload: {
  base64: string
  mimeType: string
  analysis: AnalysisResult
  promptVersion: string
}) {
```

Find the INSERT block:

```typescript
  const { data: row, error: insertError } = await supabase
    .from("shots")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      grade: payload.analysis.grade,
      score: payload.analysis.score,
      analysis: payload.analysis,
      feedback: null,
    })
    .select("id")
    .single()
```

Replace with (adds `prompt_version`):

```typescript
  const { data: row, error: insertError } = await supabase
    .from("shots")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      grade: payload.analysis.grade,
      score: payload.analysis.score,
      analysis: payload.analysis,
      feedback: null,
      prompt_version: payload.promptVersion,
    })
    .select("id")
    .single()
```

- [ ] **Step 2: Type check (will fail — main-shot-flow not updated yet)**

```bash
npx tsc --noEmit
```

Expected: error in `components/main-shot-flow.tsx` about missing `promptVersion`. **This is expected** — fixed in Task 12. Proceed without committing.

- [ ] **Step 3: Defer commit until callers are updated**

Don't commit yet. The action signature change requires the caller (Task 12) to be updated in the same commit, otherwise master breaks. Stash the change as in-flight:

```bash
git status   # confirm modification is on disk
```

Move to next task. Will commit `save-shot.ts` together with `main-shot-flow.tsx` in Task 12.

---

## Task 6: Extend `updateShotFeedback` with correction handling

**Files:**
- Modify: `app/actions/feedback.ts`

- [ ] **Step 1: Rewrite `feedback.ts`**

Replace the entire file content with:

```typescript
"use server"

import { createClient } from "@/lib/supabase/server"
import type { UserCorrection } from "@/lib/types"

export async function updateShotFeedback(
  shotId: string,
  feedback: "up" | "down" | null,
  correction?: UserCorrection | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()
  if (!supabase) {
    return { ok: false, message: "Supabase가 설정되지 않았습니다" }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "로그인이 필요합니다" }
  }

  const update: Record<string, unknown> = { feedback }
  if (correction !== undefined) {
    update.user_correction = correction
  }

  const { error } = await supabase
    .from("shots")
    .update(update)
    .eq("id", shotId)
    .eq("user_id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
```

**Key behavior:**
- `correction === undefined` → `user_correction` column NOT in update payload → not touched
- `correction === null` → `user_correction` column set to NULL
- `correction === { expected_grade, note }` → set to jsonb

- [ ] **Step 2: Type check (will fail — feedback-buttons.tsx still uses old signature)**

```bash
npx tsc --noEmit
```

Expected: error about FeedbackButtons calling old signature. **Expected** — fixed in Task 10. Don't commit yet.

- [ ] **Step 3: Defer commit**

Don't commit. Will land together with `feedback-buttons.tsx` updates in Task 10.

---

## Task 7: Install shadcn drawer + sonner

**Files:**
- Create (via CLI): `components/ui/drawer.tsx`
- Create (via CLI): `components/ui/sonner.tsx`
- Modify (auto): `package.json`, `package-lock.json`

- [ ] **Step 1: Run shadcn CLI**

```bash
npx shadcn@latest add drawer sonner
```

If prompted about overwrites, accept. The CLI will:
- Install `vaul`, `sonner`, `next-themes` to `package.json`
- Create `components/ui/drawer.tsx`
- Create `components/ui/sonner.tsx`

- [ ] **Step 2: Verify files exist**

```bash
ls components/ui/
```

Expected output includes:
```
button.tsx
card.tsx
drawer.tsx
sonner.tsx
```

And in `package.json`:

```bash
grep -E '"(vaul|sonner|next-themes)"' package.json
```

Expected: all three present.

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: exit 0 (these primitives are self-contained).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/ui/drawer.tsx components/ui/sonner.tsx
git commit -m "$(cat <<'EOF'
Install shadcn drawer + sonner primitives

Adds vaul (mobile-native bottom sheet), sonner (toast), and next-themes
(sonner peer dep). Generated by 'npx shadcn add drawer sonner'.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Mount `<Toaster />` in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read current `app/layout.tsx`**

```bash
# Inspect to confirm structure before editing
```

Use Read tool on `app/layout.tsx`.

- [ ] **Step 2: Add Toaster import + mount**

Add import at top of file:

```typescript
import { Toaster } from "@/components/ui/sonner"
```

Inside the `<body>` element, after the children render, add `<Toaster />`. Example (adjust to actual structure):

```typescript
<body className={...}>
  {children}
  <Toaster richColors position="top-center" />
</body>
```

`richColors` makes success/error variants visually distinct. `top-center` keeps it visible on mobile without overlapping bottom UI.

- [ ] **Step 3: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "$(cat <<'EOF'
Mount sonner Toaster in root layout

Top-center placement avoids covering the bottom drawer / nav on mobile;
richColors gives success/error visual distinction for the correction
submit toast.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Build `CorrectionDrawer` component

**Files:**
- Create: `components/correction-drawer.tsx`

- [ ] **Step 1: Create the component**

Create `components/correction-drawer.tsx` with:

```typescript
"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { Grade, UserCorrection } from "@/lib/types"
import { cn } from "@/lib/utils"

const GRADES: Grade[] = ["A", "B", "C", "D", "F"]

const GRADE_BG: Record<Grade, string> = {
  A: "bg-[#22c55e]",
  B: "bg-[#84cc16]",
  C: "bg-[#eab308]",
  D: "bg-[#f97316]",
  F: "bg-[#ef4444]",
}

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-[#22c55e]",
  B: "text-[#84cc16]",
  C: "text-[#eab308]",
  D: "text-[#f97316]",
  F: "text-[#ef4444]",
}

const GRADE_BORDER: Record<Grade, string> = {
  A: "border-[#22c55e]",
  B: "border-[#84cc16]",
  C: "border-[#eab308]",
  D: "border-[#f97316]",
  F: "border-[#ef4444]",
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCorrection: UserCorrection | null
  onSubmit: (correction: UserCorrection) => Promise<{ ok: boolean; message?: string }>
}

export function CorrectionDrawer({ open, onOpenChange, initialCorrection, onSubmit }: Props) {
  const [grade, setGrade] = useState<Grade | null>(initialCorrection?.expected_grade ?? null)
  const [note, setNote] = useState<string>(initialCorrection?.note ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setGrade(initialCorrection?.expected_grade ?? null)
      setNote(initialCorrection?.note ?? "")
      setError(null)
    }
  }, [open, initialCorrection])

  const handleSubmit = async () => {
    if (!grade || submitting) return
    setSubmitting(true)
    setError(null)
    const result = await onSubmit({
      expected_grade: grade,
      ...(note.trim() ? { note: note.trim() } : {}),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message ?? "저장에 실패했어요")
      return
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>실제 등급은?</DrawerTitle>
          <DrawerDescription>AI 분석을 보정해 주세요. 데이터는 프롬프트 개선에 쓰입니다.</DrawerDescription>
        </DrawerHeader>

        <div className="grid grid-cols-5 gap-2 px-4">
          {GRADES.map((g) => {
            const selected = grade === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                aria-pressed={selected}
                className={cn(
                  "h-14 rounded-lg border-2 text-lg font-semibold transition-transform",
                  selected
                    ? `${GRADE_BG[g]} text-white scale-105 ${GRADE_BORDER[g]}`
                    : `bg-transparent ${GRADE_TEXT[g]} ${GRADE_BORDER[g]}`
                )}
              >
                {g}
              </button>
            )
          })}
        </div>

        <div className="space-y-2 px-4 pt-4">
          <label className="text-muted-foreground text-sm font-medium" htmlFor="correction-note">
            한마디 (선택)
          </label>
          <textarea
            id="correction-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 크레마 거의 없었음"
            rows={2}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {error ? (
          <p className="text-destructive px-4 pt-2 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <DrawerFooter>
          <Button
            type="button"
            size="lg"
            disabled={!grade || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "저장 중…" : "제출"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 2: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/correction-drawer.tsx
git commit -m "$(cat <<'EOF'
Add CorrectionDrawer for 👎 grade boost

5-column grade button grid (A/B/C/D/F) using project grade colors,
optional Korean note textarea, submit disabled until grade chosen.
Re-resets state on each open via initialCorrection prop so re-edit
flow pre-fills correctly.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Refactor `FeedbackButtons` (toggle + drawer + props)

**Files:**
- Modify: `components/feedback-buttons.tsx`

This task ALSO closes the `feedback.ts` change from Task 6 — both ship together.

- [ ] **Step 1: Rewrite the component**

Replace entire `components/feedback-buttons.tsx` content with:

```typescript
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateShotFeedback } from "@/app/actions/feedback"
import { CorrectionDrawer } from "@/components/correction-drawer"
import { Button } from "@/components/ui/button"
import type { UserCorrection } from "@/lib/types"

type Feedback = "up" | "down"

type Props = {
  shotId: string | null | undefined
  initialFeedback?: Feedback | null
  initialCorrection?: UserCorrection | null
}

export function FeedbackButtons({
  shotId,
  initialFeedback = null,
  initialCorrection = null,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback | null>(initialFeedback)
  const [correction, setCorrection] = useState<UserCorrection | null>(initialCorrection)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUp = () => {
    if (!shotId || pending) return
    setError(null)
    const prevFeedback = feedback
    const prevCorrection = correction
    if (feedback === "up") {
      // toggle off
      setFeedback(null)
      setCorrection(null)
      startTransition(async () => {
        const result = await updateShotFeedback(shotId, null, null)
        if (!result.ok) {
          setFeedback(prevFeedback)
          setCorrection(prevCorrection)
          setError(result.message)
        }
      })
    } else {
      // set to up, clear any prior correction
      setFeedback("up")
      setCorrection(null)
      startTransition(async () => {
        const result = await updateShotFeedback(shotId, "up", null)
        if (!result.ok) {
          setFeedback(prevFeedback)
          setCorrection(prevCorrection)
          setError(result.message)
        }
      })
    }
  }

  const handleDown = () => {
    if (!shotId || pending) return
    setError(null)
    if (feedback !== "down") {
      // first down click — save immediately, leave correction column untouched
      const prevFeedback = feedback
      setFeedback("down")
      startTransition(async () => {
        const result = await updateShotFeedback(shotId, "down")
        if (!result.ok) {
          setFeedback(prevFeedback)
          setError(result.message)
          return
        }
      })
    }
    // Always open drawer (whether first time or re-edit)
    setDrawerOpen(true)
  }

  const handleSubmitCorrection = async (
    next: UserCorrection
  ): Promise<{ ok: boolean; message?: string }> => {
    if (!shotId) return { ok: false, message: "shotId 없음" }
    const prev = correction
    setCorrection(next)
    const result = await updateShotFeedback(shotId, "down", next)
    if (!result.ok) {
      setCorrection(prev)
      return { ok: false, message: result.message }
    }
    toast.success("피드백 감사합니다 🙏")
    return { ok: true }
  }

  const disabled = !shotId || pending

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={feedback === "up" ? "default" : "secondary"}
          size="sm"
          disabled={disabled}
          onClick={handleUp}
          aria-pressed={feedback === "up"}
        >
          👍 정확해요
        </Button>
        <Button
          type="button"
          variant={feedback === "down" ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={handleDown}
          aria-pressed={feedback === "down"}
        >
          👎 아닌데
        </Button>
        {!shotId ? (
          <span className="text-muted-foreground text-xs">
            히스토리에 저장하면 피드백을 남길 수 있어요.
          </span>
        ) : feedback ? (
          <span className="text-muted-foreground text-xs">
            저장됨{pending ? " · 업데이트 중…" : ""}
            {feedback === "down" && correction
              ? ` · 보정 ${correction.expected_grade}`
              : ""}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <CorrectionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialCorrection={correction}
        onSubmit={handleSubmitCorrection}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0. (Now both `feedback.ts` and `feedback-buttons.tsx` are aligned.)

- [ ] **Step 3: Commit Task 6 + Task 10 together**

```bash
git add app/actions/feedback.ts components/feedback-buttons.tsx
git commit -m "$(cat <<'EOF'
Wire up feedback toggle + correction drawer

updateShotFeedback gains optional correction arg with undefined/null/object
semantics (undefined = leave column untouched, null = explicit NULL,
object = jsonb). FeedbackButtons handles toggle locally so the server
action stays a dumb overwrite, opens CorrectionDrawer on 👎 click, and
shows a sonner success toast after correction submit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Pass `userCorrection` through `GradeCard`

**Files:**
- Modify: `components/grade-card.tsx`

- [ ] **Step 1: Add prop and pass through**

Edit `components/grade-card.tsx`. Update the `Props` type:

```typescript
type Props = {
  analysis: AnalysisResult
  shotId?: string | null
  initialFeedback?: "up" | "down" | null
  initialCorrection?: UserCorrection | null
  className?: string
}
```

Add the import at the top:

```typescript
import type { AnalysisResult, UserCorrection } from "@/lib/types"
```

(If `AnalysisResult` is already imported, just add `UserCorrection` to the same import.)

Update the function signature:

```typescript
export function GradeCard({
  analysis,
  shotId,
  initialFeedback = null,
  initialCorrection = null,
  className,
}: Props) {
```

Find the `<FeedbackButtons>` render and add the prop:

```typescript
<FeedbackButtons
  shotId={shotId}
  initialFeedback={initialFeedback}
  initialCorrection={initialCorrection}
/>
```

- [ ] **Step 2: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/grade-card.tsx
git commit -m "$(cat <<'EOF'
Pass userCorrection through GradeCard to FeedbackButtons

Pure pass-through so the history detail page can hydrate the drawer
pre-fill state from the DB row.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Wire `MainShotFlow` (state + save call) — closes Task 5

**Files:**
- Modify: `components/main-shot-flow.tsx`

- [ ] **Step 1: Add `promptVersion` state and update API response handling**

Edit `components/main-shot-flow.tsx`. Update imports:

```typescript
import type { AnalysisResult, AnalyzeResponseBody } from "@/lib/types"
```

Add a state hook alongside the existing `analysis` state:

```typescript
const [promptVersion, setPromptVersion] = useState<string | null>(null)
```

In `analyze()`, find this block:

```typescript
      const data = (await res.json()) as AnalysisResult & { error?: string; code?: string }
      if (!res.ok) {
        setError(data.error ?? "분석에 실패했습니다")
        return
      }
      setAnalysis(data as AnalysisResult)
```

Replace with:

```typescript
      const data = (await res.json()) as AnalyzeResponseBody & { error?: string; code?: string }
      if (!res.ok) {
        setError(data.error ?? "분석에 실패했습니다")
        return
      }
      const { prompt_version, ...analysisOnly } = data
      setAnalysis(analysisOnly as AnalysisResult)
      setPromptVersion(prompt_version)
```

In `onCapture` callback (state reset), add `setPromptVersion(null)`:

```typescript
  const onCapture = useCallback((base64: string, mime: string) => {
    setRawBase64(base64)
    setMimeType(mime)
    setAnalysis(null)
    setPromptVersion(null)
    setShotId(null)
    setError(null)
  }, [])
```

Also reset at the start of `analyze()` alongside other reset calls:

```typescript
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setPromptVersion(null)
    setShotId(null)
```

- [ ] **Step 2: Pass `promptVersion` to `saveShotToHistory`**

Find the `saveHistory` function:

```typescript
      const result = await saveShotToHistory({
        base64: rawBase64,
        mimeType,
        analysis,
      })
```

Replace with (adds promptVersion + guards):

```typescript
      if (!promptVersion) {
        setError("prompt_version 누락 — 다시 분석해 주세요")
        return
      }
      const result = await saveShotToHistory({
        base64: rawBase64,
        mimeType,
        analysis,
        promptVersion,
      })
```

- [ ] **Step 3: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0. (Now `save-shot.ts` from Task 5 is satisfied.)

- [ ] **Step 4: Commit Task 5 + Task 12 together**

```bash
git add app/actions/save-shot.ts components/main-shot-flow.tsx
git commit -m "$(cat <<'EOF'
Thread prompt_version from analyze response into save action

MainShotFlow stores promptVersion alongside analysis state and passes it
into saveShotToHistory, which writes to shots.prompt_version. Reset on
capture/re-analyze to avoid stamping stale versions.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Update history detail page (DB select + props)

**Files:**
- Modify: `app/history/[id]/page.tsx`

- [ ] **Step 1: Read current page**

Use Read tool on `app/history/[id]/page.tsx`. Note the current SELECT string and how the row is passed to `GradeCard`.

- [ ] **Step 2: Add new columns to SELECT**

Find the `.select(...)` call (currently around line 56):

```typescript
.select("id, image_url, grade, score, analysis, feedback, created_at")
```

Replace with:

```typescript
.select("id, image_url, grade, score, analysis, feedback, user_correction, prompt_version, created_at")
```

- [ ] **Step 3: Update the row type and pass new prop**

If the page declares a local type (e.g., the `Shot` type around line 14), add the two new fields:

```typescript
type Shot = {
  id: string
  image_url: string
  grade: Grade
  score: number
  analysis: AnalysisResult
  feedback: "up" | "down" | null
  user_correction: UserCorrection | null
  prompt_version: string | null
  created_at: string
}
```

Add to imports:

```typescript
import type { AnalysisResult, Grade, UserCorrection } from "@/lib/types"
```

Find the `<GradeCard>` render (currently around line 93). Update to pass `initialCorrection`:

```typescript
<GradeCard
  analysis={shot.analysis}
  shotId={shot.id}
  initialFeedback={shot.feedback}
  initialCorrection={shot.user_correction}
/>
```

- [ ] **Step 4: Type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/history/[id]/page.tsx
git commit -m "$(cat <<'EOF'
Hydrate history detail page with user_correction + prompt_version

Adds the new columns to the SELECT and passes user_correction into
GradeCard so the drawer pre-fills correctly when re-editing past
feedback from the history view.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Final verification

**Files:** none

- [ ] **Step 1: Final type check + lint**

```bash
npx tsc --noEmit && npx eslint . --max-warnings=0
```

Expected: both exit 0.

- [ ] **Step 2: Build sanity check**

```bash
npx next build
```

Expected: build succeeds without errors.

- [ ] **Step 3: Local manual test (dev server)**

Start dev:

```bash
npm run dev
```

Open `http://localhost:3000`, log in, then run through:

| # | Scenario | Expected |
|---|---|---|
| 1 | Capture → Analyze → Save → Click 👍 | Button highlights, "저장됨" appears |
| 2 | Click 👍 again | Toggles off, "저장됨" disappears |
| 3 | Click 👎 (no prior correction) | Button highlights immediately, drawer slides up |
| 4 | Drawer: pick grade C, type a note, Submit | Drawer closes, sonner toast appears, "저장됨 · 보정 C" indicator |
| 5 | Click 👎 again on same shot | Drawer reopens with C grade pre-selected and note pre-filled |
| 6 | Click 👍 (override) | Toggles to 👍, correction silently cleared (verify via DB query: `select feedback, user_correction from shotgrade.shots where id = '<shotId>'`) |
| 7 | Drag drawer down without submitting | Drawer closes, no DB change |
| 8 | Navigate to history list, open a saved shot, run scenarios 3-6 there | Same behavior |

For DB verification (run in Supabase SQL editor):

```sql
select id, feedback, user_correction, prompt_version, created_at
from shotgrade.shots
order by created_at desc
limit 10;
```

`prompt_version` should be `'v1'` for new rows; old rows backfilled to `'v1'` too.

- [ ] **Step 4: Push to remote (if user authorizes)**

```bash
git push
```

Confirm with user before pushing — they may want to review commits first.

- [ ] **Step 5: Notify user of follow-ups**

Tell user:
1. **Notion 정의서 업데이트** required — new schema fields + drawer flow
2. **Vercel 배포 후 production 검증** — repeat scenario 4 + 5 there
3. When tuning prompt next time, **bump `PROMPT_VERSION` in `lib/prompts.ts`** before deploying

---

## Self-Review Notes

**Spec coverage check:**
- Schema (user_correction + prompt_version) → Task 1 ✓
- Types → Task 3 ✓
- API stamping → Task 4 ✓
- Server actions (save + feedback extension) → Tasks 5, 6, 10, 12 ✓
- UI (drawer, toggle logic, drawer integration, pre-fill) → Tasks 7, 8, 9, 10 ✓
- History page hydration → Task 13 ✓
- prompt_version constant → Task 2 ✓
- Out-of-scope items (tests, prompt bump automation, Notion sync, dashboards) — correctly omitted

**Type consistency:**
- `UserCorrection` shape (`expected_grade: Grade`, `note?: string`) — consistent across types.ts, server action, drawer, FeedbackButtons
- `feedback` union (`"up" | "down" | null`) — consistent
- `correction` arg semantics (undefined/null/object) — documented identically in feedback.ts and the spec table
- `Drawer` / `Toaster` are shadcn-generated; not invented

**Dependency ordering:**
- Schema migration must precede any save (Task 1 first)
- Tasks 5+6 don't compile until 10+12 land — explicitly grouped commits
- Tasks 7→8 (install drawer/sonner before mounting/using)
