import Link from "next/link"
import { notFound } from "next/navigation"
import { GradeCard } from "@/components/grade-card"
import { createClient } from "@/lib/supabase/server"
import { shotImageDisplayUrl } from "@/lib/supabase/storage"
import type { AnalysisResult, Grade, UserCorrection } from "@/lib/types"

type ShotDetailRow = {
  id: string
  image_url: string
  grade: Grade
  score: number
  analysis: AnalysisResult
  feedback: "up" | "down" | null
  user_correction: UserCorrection | null
  prompt_version: string | null
  created_at: string
}

export default async function ShotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  if (!supabase) {
    return (
      <div className="bg-background min-h-full">
        <BackHeader title="샷 상세" />
        <div className="mx-auto max-w-lg px-4 py-6">
          <p className="text-muted-foreground text-sm">
            Supabase 환경 변수를 설정하면 상세 정보를 볼 수 있어요.
          </p>
        </div>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="bg-background min-h-full">
        <BackHeader title="샷 상세" />
        <div className="mx-auto max-w-lg px-4 py-6">
          <p className="text-muted-foreground text-sm">로그인 후 확인할 수 있어요.</p>
        </div>
      </div>
    )
  }

  const { data: shot, error } = await supabase
    .from("shots")
    .select("id, image_url, grade, score, analysis, feedback, user_correction, prompt_version, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("image_url", "")
    .maybeSingle<ShotDetailRow>()

  if (error) {
    return (
      <div className="bg-background min-h-full">
        <BackHeader title="샷 상세" />
        <div className="mx-auto max-w-lg px-4 py-6">
          <p className="text-destructive text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!shot) {
    notFound()
  }

  const captured = new Date(shot.created_at).toLocaleString("ko-KR")
  const displayUrl = await shotImageDisplayUrl(supabase, shot.image_url)

  return (
    <div className="bg-background min-h-full">
      <BackHeader title="샷 상세" />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded shot */}
        <img
          src={displayUrl}
          alt="저장된 샷"
          className="w-full rounded-xl border border-border object-cover"
        />
        <p className="text-muted-foreground text-xs">{captured} 촬영</p>
        <GradeCard
          analysis={shot.analysis}
          shotId={shot.id}
          initialFeedback={shot.feedback}
          initialCorrection={shot.user_correction}
        />
      </div>
    </div>
  )
}

function BackHeader({ title }: { title: string }) {
  return (
    <header className="border-border flex items-center gap-3 border-b px-4 py-3">
      <Link
        href="/history"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← 히스토리
      </Link>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
