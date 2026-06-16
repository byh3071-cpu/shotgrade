"use server"

import { createClient } from "@/lib/supabase/server"

export async function saveShotToHistory(payload: {
  shotId: string
  base64: string
  mimeType: string
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

  const { data: row, error: updateError } = await supabase
    .from("shots")
    .update({ image_url: path })
    .eq("id", payload.shotId)
    .eq("user_id", user.id)
    .select("id")
    .single()

  if (updateError || !row) {
    return {
      ok: false as const,
      message: updateError?.message ?? "히스토리 row를 찾지 못했습니다",
    }
  }

  return { ok: true as const, shotId: row.id }
}
