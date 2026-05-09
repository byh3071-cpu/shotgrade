import Link from "next/link"
import type { AnalysisResult } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { shotImageDisplayUrl } from "@/lib/supabase/storage"

export async function ShotHistoryList() {
  const supabase = await createClient()
  if (!supabase) {
    return (
      <p className="text-muted-foreground text-sm">
        Supabase 환경 변수를 설정하면 히스토리가 표시됩니다.
      </p>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <p className="text-muted-foreground text-sm">로그인 후 내 샷 히스토리를 볼 수 있어요.</p>
    )
  }

  const { data: shots, error } = await supabase
    .from("shots")
    .select("id, image_url, grade, analysis, created_at")
    .eq("user_id", user.id)
    .neq("image_url", "")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>
  }

  if (!shots?.length) {
    return <p className="text-muted-foreground text-sm">아직 저장된 샷이 없어요.</p>
  }

  const items = await Promise.all(
    shots.map(async (shot) => ({
      ...shot,
      displayUrl: await shotImageDisplayUrl(supabase, shot.image_url as string),
    }))
  )

  return (
    <ul className="flex flex-col gap-3">
      {items.map((shot) => (
        <li key={shot.id}>
          <Link
            href={`/history/${shot.id}`}
            className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.displayUrl}
              alt=""
              className="size-16 shrink-0 rounded-lg object-cover"
            />
            <div className="flex min-w-0 flex-col justify-center gap-1 text-sm">
              <span className="font-medium">{shot.grade}등급</span>
              <span className="text-muted-foreground truncate">
                크레마 {(shot.analysis as AnalysisResult).crema.thickness_mm}mm
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(shot.created_at as string).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
