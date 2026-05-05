"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { saveShotToHistory } from "@/app/actions/save-shot"
import { AuthButton } from "@/components/auth-button"
import { CameraCapture } from "@/components/camera-capture"
import { GradeCard } from "@/components/grade-card"
import { Button } from "@/components/ui/button"
import type { AnalysisResult, AnalyzeResponseBody } from "@/lib/types"
import { cn } from "@/lib/utils"

function AnalyzingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card/80 ring-1 ring-border/60">
      <div className="border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-12 animate-pulse rounded bg-muted/60" />
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted/60" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
      <div className="space-y-3 p-6">
        {[
          ["w-20", "w-12"],
          ["w-16", "w-32"],
          ["w-20", "w-16"],
          ["w-24", "w-20"],
        ].map(([labelW, valueW], i) => (
          <div key={i} className="flex items-center justify-between">
            <div className={`h-4 ${labelW} animate-pulse rounded bg-muted/40`} />
            <div className={`h-4 ${valueW} animate-pulse rounded bg-muted/40`} />
          </div>
        ))}
        <div className="mt-4 space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
      <div className="border-t border-border/60 px-6 py-3 text-center">
        <span className="text-muted-foreground text-xs">AI가 샷을 분석하고 있어요…</span>
      </div>
    </div>
  )
}

export function MainShotFlow() {
  const [rawBase64, setRawBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("image/jpeg")
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [promptVersion, setPromptVersion] = useState<string | null>(null)
  const [shotId, setShotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCapture = useCallback((base64: string, mime: string) => {
    setRawBase64(base64)
    setMimeType(mime)
    setAnalysis(null)
    setPromptVersion(null)
    setShotId(null)
    setError(null)
  }, [])

  const analyze = async () => {
    if (!rawBase64) {
      setError("먼저 샷 이미지를 선택해 주세요")
      return
    }
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setPromptVersion(null)
    setShotId(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: rawBase64,
          mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
        }),
      })
      const data = (await res.json()) as AnalyzeResponseBody & { error?: string; code?: string }
      if (!res.ok) {
        setError(data.error ?? "분석에 실패했습니다")
        return
      }
      const { prompt_version, ...analysisOnly } = data
      setAnalysis(analysisOnly as AnalysisResult)
      setPromptVersion(prompt_version)
    } catch {
      setError("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const saveHistory = async () => {
    if (!rawBase64 || !analysis) return
    setSaving(true)
    setError(null)
    try {
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
      if (!result.ok) {
        setError(result.message)
        return
      }
      setShotId(result.shotId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-lg font-semibold tracking-tight text-[#d4a574]">☕ ShotGrade</span>
        <AuthButton />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <CameraCapture onCapture={onCapture} />

        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          onClick={() => void analyze()}
          disabled={!rawBase64 || loading}
        >
          {loading ? "⏳ 분석 중…" : "📸 샷 분석하기"}
        </Button>

        {error ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? <AnalyzingSkeleton /> : null}

        {analysis ? (
          <div className="flex flex-col gap-4">
            <GradeCard analysis={analysis} shotId={shotId} />
            <Button
              type="button"
              variant="secondary"
              disabled={saving || !!shotId}
              onClick={() => void saveHistory()}
            >
              {shotId ? "히스토리에 저장됨" : saving ? "저장 중…" : "히스토리에 저장"}
            </Button>
          </div>
        ) : null}

        <Link
          href="/history"
          className={cn(
            "text-center text-sm font-medium text-[#d4a574] underline-offset-4 hover:underline"
          )}
        >
          📋 내 히스토리 보기
        </Link>
      </main>
    </div>
  )
}
