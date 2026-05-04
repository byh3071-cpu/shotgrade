"use client"

import type { AnalysisResult } from "@/lib/types"
import { cn } from "@/lib/utils"
import { gradeBadgeClass } from "@/lib/grade-colors"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FeedbackButtons } from "@/components/feedback-buttons"

type Props = {
  analysis: AnalysisResult
  shotId?: string | null
  initialFeedback?: "up" | "down" | null
  className?: string
}

function extractionLabel(status: AnalysisResult["extraction"]["status"]): string {
  const map = { under: "부족", optimal: "적정", over: "과다" }
  return map[status]
}

export function GradeCard({ analysis, shotId, initialFeedback = null, className }: Props) {
  return (
    <Card className={cn("border-border/80 bg-card/80 ring-1 ring-border/60", className)}>
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-lg">등급</CardTitle>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-lg font-semibold ring-1",
              gradeBadgeClass(analysis.grade)
            )}
          >
            {analysis.grade}
          </span>
          <span className="text-muted-foreground text-sm">
            {analysis.score}점 · 만점 100
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-2">
        <div className="grid gap-2 text-sm">
          <Row label="크레마 두께" value={`${analysis.crema.thickness_mm} mm`} />
          <Row label="색상" value={analysis.crema.description} />
          <Row label="균일도" value={`${analysis.crema.uniformity}%`} />
          <Row
            label="추출 시간"
            value={`약 ${analysis.extraction.estimated_time_sec}s · ${extractionLabel(analysis.extraction.status)}`}
          />
          <Row label="추출 코멘트" value={analysis.extraction.description} />
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
            조절 가이드
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {analysis.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed">{analysis.overall_comment}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <FeedbackButtons shotId={shotId} initialFeedback={initialFeedback} />
      </CardFooter>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
