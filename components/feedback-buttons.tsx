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
