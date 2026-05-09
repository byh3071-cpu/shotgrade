import type { AnalysisResult, Grade } from "@/lib/types"

const GRADES: Grade[] = ["A", "B", "C", "D", "F"]

export class UnsupportedInputError extends Error {
  readonly inputType: string
  constructor(inputType: string, reason: string) {
    super(reason)
    this.name = "UnsupportedInputError"
    this.inputType = inputType
  }
}

function stripCodeFence(raw: string): string {
  let s = raw.trim()
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "")
    s = s.replace(/\s*```$/, "")
  }
  return s.trim()
}

function extractJsonObject(text: string): string | null {
  const m = text.match(/\{[\s\S]*\}/)
  return m ? m[0] : null
}

export function parseAnalysisJson(text: string): AnalysisResult {
  const cleaned = stripCodeFence(text)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const extracted = extractJsonObject(cleaned)
    if (!extracted) throw new Error("INVALID_ANALYSIS_JSON")
    parsed = JSON.parse(extracted)
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("INVALID_ANALYSIS_SHAPE")
  }
  const o = parsed as Record<string, unknown>

  const inputType = o.input_type
  if (inputType === "portafilter_only" || inputType === "not_espresso") {
    const reason =
      typeof o.reason === "string" && o.reason.trim()
        ? o.reason.trim()
        : inputType === "portafilter_only"
          ? "잔에 받기 전 포터필터 단계입니다. 잔에 담긴 샷을 다시 촬영해 주세요."
          : "에스프레소 샷 사진이 아니에요. 잔에 담긴 에스프레소를 촬영해 주세요."
    throw new UnsupportedInputError(inputType, reason)
  }

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
