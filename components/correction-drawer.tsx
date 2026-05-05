"use client"

import { useState } from "react"

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

// Form is mounted fresh per open via parent's `{open && ...}` guard.
// Each mount re-runs the useState initializers with the current initialCorrection,
// which is the React-recommended way to "reset state when a prop changes" without
// useEffect (avoids react-hooks/set-state-in-effect).
function CorrectionForm({
  initialCorrection,
  onSubmit,
  onClose,
}: {
  initialCorrection: UserCorrection | null
  onSubmit: (correction: UserCorrection) => Promise<{ ok: boolean; message?: string }>
  onClose: () => void
}) {
  const [grade, setGrade] = useState<Grade | null>(initialCorrection?.expected_grade ?? null)
  const [note, setNote] = useState<string>(initialCorrection?.note ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    onClose()
  }

  return (
    <>
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
    </>
  )
}

export function CorrectionDrawer({ open, onOpenChange, initialCorrection, onSubmit }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {open ? (
          <CorrectionForm
            initialCorrection={initialCorrection}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
