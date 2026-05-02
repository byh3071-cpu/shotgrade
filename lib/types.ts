export type Grade = "A" | "B" | "C" | "D" | "F"

export type AnalysisResult = {
  grade: Grade
  score: number
  crema: {
    thickness_mm: number
    color: string
    uniformity: number
    description: string
  }
  extraction: {
    estimated_time_sec: number
    status: "under" | "optimal" | "over"
    description: string
  }
  tips: string[]
  overall_comment: string
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
  created_at: string
}
