"use server"

import { createClient } from "@/lib/supabase/server"
import type { AnalysisResult } from "@/lib/types"

export async function saveShotToHistory(payload: {
  base64: string
  mimeType: string
  analysis: AnalysisResult
  promptVersion: string
}) {
  const supabase = await createClient()
  if (!supabase) {
    return { ok: false as const, message: "Supabase가 설정되지 않았습니다" }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, message: "로그인이 필요합니다" }
  }

  const ext =
    payload.mimeType === "image/png"
      ? "png"
      : payload.mimeType === "image/webp"
        ? "webp"
        : "jpg"
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(payload.base64, "base64")

  const { error: uploadError } = await supabase.storage
    .from("shot-images")
    .upload(path, buffer, {
      contentType: payload.mimeType,
      upsert: false,
    })

  if (uploadError) {
    return { ok: false as const, message: uploadError.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("shot-images").getPublicUrl(path)

  const { data: row, error: insertError } = await supabase
    .from("shots")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      grade: payload.analysis.grade,
      score: payload.analysis.score,
      analysis: payload.analysis,
      feedback: null,
      prompt_version: payload.promptVersion,
    })
    .select("id")
    .single()

  if (insertError) {
    return { ok: false as const, message: insertError.message }
  }

  return { ok: true as const, shotId: row.id }
}
