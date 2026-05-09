export type Grade = "A" | "B" | "C" | "D" | "F"

export type UserCorrection = {
  expected_grade: Grade
  note?: string
}

export type InputType = "espresso_in_cup" | "portafilter_only" | "not_espresso"

export type SurfacePattern =
  | "tiger_stripe"
  | "blonde"
  | "channeling"
  | "uniform"
  | "broken"
  | "none"

export type AnalysisResult = {
  input_type?: InputType
  grade: Grade
  score: number
  crema: {
    thickness_mm: number
    color: string
    uniformity: number
    description: string
  }
  visual?: {
    surface_pattern: SurfacePattern | string
    observations: string[]
    defects: string[]
  }
  /** Legacy field — old DB rows may still contain this. New analyses do not. */
  extraction?: {
    estimated_time_sec: number
    status: "under" | "optimal" | "over"
    description: string
  }
  tips: string[]
  overall_comment: string
}

export type AnalyzeResponseBody = AnalysisResult & {
  prompt_version: string
  shot_id: string
}

export type AnalyzeRequestBody = {
  image: string
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

export type AnalyzeErrorBody = {
  error: string
  code: string
}

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
