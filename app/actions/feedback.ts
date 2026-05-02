"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateShotFeedback(shotId: string, type: "up" | "down") {
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
  const { error } = await supabase
    .from("shots")
    .update({ feedback: type })
    .eq("id", shotId)
    .eq("user_id", user.id)

  if (error) {
    return { ok: false as const, message: error.message }
  }
  return { ok: true as const }
}
