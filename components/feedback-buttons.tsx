"use client"

import { useTransition } from "react"
import { updateShotFeedback } from "@/app/actions/feedback"
import { Button } from "@/components/ui/button"

type Props = {
  shotId: string | null | undefined
}

export function FeedbackButtons({ shotId }: Props) {
  const [pending, startTransition] = useTransition()

  const send = (type: "up" | "down") => {
    if (!shotId) return
    startTransition(async () => {
      await updateShotFeedback(shotId, type)
    })
  }

  const disabled = !shotId || pending

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => send("up")}
      >
        👍 정확해요
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => send("down")}>
        👎 아닌데
      </Button>
      {!shotId ? (
        <span className="text-muted-foreground text-xs">히스토리에 저장하면 피드백을 남길 수 있어요.</span>
      ) : null}
    </div>
  )
}
