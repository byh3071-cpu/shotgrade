"use server"

import { createClient } from "@/lib/supabase/server"
import type { UserCorrection } from "@/lib/types"

export async function updateShotFeedback(
  shotId: string,
  feedback: "up" | "down" | null,
  correction?: UserCorrection | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()
  if (!supabase) {
    return { ok: false, message: "Supabase가 설정되지 않았습니다" }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "로그인이 필요합니다" }
  }

  const update: Record<string, unknown> = { feedback }
  if (correction !== undefined) {
    update.user_correction = correction
  }

  const { error } = await supabase
    .from("shots")
    .update(update)
    .eq("id", shotId)
    .eq("user_id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
