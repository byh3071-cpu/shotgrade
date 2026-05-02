import type { AnalysisResult, Grade } from "@/lib/types"

const GRADES: Grade[] = ["A", "B", "C", "D", "F"]

function stripCodeFence(raw: string): string {
  let s = raw.trim()
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "")
    s = s.replace(/\s*```$/, "")
  }
  return s.trim()
}

export function parseAnalysisJson(text: string): AnalysisResult {
  const cleaned = stripCodeFence(text)
  const parsed = JSON.parse(cleaned) as unknown
  if (!parsed || typeof parsed !== "object") {
    throw new Error("INVALID_ANALYSIS_SHAPE")
  }
  const o = parsed as Record<string, unknown>
  const grade = o.grade
  if (typeof grade !== "string" || !GRADES.includes(grade as Grade)) {
    throw new Error("INVALID_GRADE")
  }
  const score = o.score
  if (typeof score !== "number" || score < 0 || score > 100) {
    throw new Error("INVALID_SCORE")
  }
  return parsed as AnalysisResult
}
