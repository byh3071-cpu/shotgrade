"use client"

import { useState, useTransition } from "react"
import { updateShotFeedback } from "@/app/actions/feedback"
import { Button } from "@/components/ui/button"

type Feedback = "up" | "down"

type Props = {
  shotId: string | null | undefined
  initialFeedback?: Feedback | null
}

export function FeedbackButtons({ shotId, initialFeedback = null }: Props) {
  const [pending, startTransition] = useTransition()
  const [current, setCurrent] = useState<Feedback | null>(initialFeedback)
  const [error, setError] = useState<string | null>(null)

  const send = (type: Feedback) => {
    if (!shotId || pending) return
    setError(null)
    const previous = current
    setCurrent(type)
    startTransition(async () => {
      const result = await updateShotFeedback(shotId, type)
      if (!result.ok) {
        setCurrent(previous)
        setError(result.message)
      }
    })
  }

  const disabled = !shotId || pending

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={current === "up" ? "default" : "secondary"}
          size="sm"
          disabled={disabled}
          onClick={() => send("up")}
          aria-pressed={current === "up"}
        >
          👍 정확해요
        </Button>
        <Button
          type="button"
          variant={current === "down" ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={() => send("down")}
          aria-pressed={current === "down"}
        >
          👎 아닌데
        </Button>
        {!shotId ? (
          <span className="text-muted-foreground text-xs">
            히스토리에 저장하면 피드백을 남길 수 있어요.
          </span>
        ) : current ? (
          <span className="text-muted-foreground text-xs">
            저장됨{pending ? " · 업데이트 중…" : ""}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
