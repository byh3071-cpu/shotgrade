import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { parseAnalysisJson, UnsupportedInputError } from "@/lib/analyze"
import {
  ANALYSIS_MODEL,
  MAX_TOKENS,
  PROMPT_VERSION,
  SHOT_ANALYSIS_PROMPT,
} from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"
import type { AnalyzeErrorBody, AnalyzeRequestBody } from "@/lib/types"

const MIME: AnalyzeRequestBody["mimeType"][] = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const body: AnalyzeErrorBody = {
      error: "Anthropic API 키가 설정되지 않았습니다",
      code: "MISSING_ANTHROPIC_KEY",
    }
    return NextResponse.json(body, { status: 503 })
  }

  const supabase = await createClient()
  if (!supabase) {
    const body: AnalyzeErrorBody = {
      error: "Supabase가 설정되지 않았습니다",
      code: "SUPABASE_NOT_CONFIGURED",
    }
    return NextResponse.json(body, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const body: AnalyzeErrorBody = {
      error: "로그인이 필요합니다",
      code: "UNAUTHORIZED",
    }
    return NextResponse.json(body, { status: 401 })
  }

  const dailyLimit = Number(process.env.NEXT_PUBLIC_MAX_FREE_SHOTS_PER_DAY ?? 1)
  if (Number.isFinite(dailyLimit) && dailyLimit > 0) {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    const { count, error: countError } = await supabase
      .from("shots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())

    if (countError) {
      const body: AnalyzeErrorBody = {
        error: "사용량 조회에 실패했습니다",
        code: "RATE_LIMIT_LOOKUP_FAILED",
      }
      return NextResponse.json(body, { status: 500 })
    }

    if ((count ?? 0) >= dailyLimit) {
      const body: AnalyzeErrorBody = {
        error: `오늘 분석 한도(${dailyLimit}회)를 모두 사용했어요`,
        code: "RATE_LIMITED",
      }
      return NextResponse.json(body, { status: 429 })
    }
  }

  let payload: AnalyzeRequestBody
  try {
    payload = (await request.json()) as AnalyzeRequestBody
  } catch {
    const body: AnalyzeErrorBody = { error: "잘못된 요청 본문입니다", code: "BAD_JSON" }
    return NextResponse.json(body, { status: 400 })
  }

  if (
    !payload.image ||
    typeof payload.mimeType !== "string" ||
    !MIME.includes(payload.mimeType as AnalyzeRequestBody["mimeType"])
  ) {
    const body: AnalyzeErrorBody = {
      error: "image(Base64)와 유효한 mimeType이 필요합니다",
      code: "INVALID_INPUT",
    }
    return NextResponse.json(body, { status: 400 })
  }

  const { data: pendingRow, error: pendingErr } = await supabase
    .from("shots")
    .insert({
      user_id: user.id,
      image_url: "",
      grade: "P",
      score: null,
      analysis: {},
      feedback: null,
      prompt_version: PROMPT_VERSION,
    })
    .select("id")
    .single()

  if (pendingErr || !pendingRow) {
    const body: AnalyzeErrorBody = {
      error: pendingErr?.message ?? "분석 슬롯 생성에 실패했습니다",
      code: "PENDING_INSERT_FAILED",
    }
    return NextResponse.json(body, { status: 500 })
  }

  const shotId = pendingRow.id as string
  const anthropic = new Anthropic({ apiKey })

  async function callModel(): Promise<string> {
    const msg = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SHOT_ANALYSIS_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: payload.mimeType,
                data: payload.image,
              },
            },
          ],
        },
      ],
    })

    console.log(
      `[analyze] cache_create=${msg.usage.cache_creation_input_tokens ?? 0} cache_read=${msg.usage.cache_read_input_tokens ?? 0} input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}`
    )

    const textBlocks = msg.content.filter((b) => b.type === "text")
    return textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n")
  }

  try {
    let lastParseErr: unknown = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await callModel()

      if (!raw.trim()) {
        const body: AnalyzeErrorBody = {
          error: "모델 응답이 비어 있습니다",
          code: "EMPTY_MODEL_OUTPUT",
        }
        return NextResponse.json(body, { status: 502 })
      }

      try {
        const analysis = parseAnalysisJson(raw)
        const { error: updateErr } = await supabase
          .from("shots")
          .update({
            grade: analysis.grade,
            score: analysis.score,
            analysis,
          })
          .eq("id", shotId)
          .eq("user_id", user.id)

        if (updateErr) {
          console.warn(`[analyze] update failed for ${shotId}:`, updateErr)
          const body: AnalyzeErrorBody = {
            error: "분석 결과 저장에 실패했습니다",
            code: "ANALYSIS_UPDATE_FAILED",
          }
          return NextResponse.json(body, { status: 500 })
        }

        return NextResponse.json({
          ...analysis,
          prompt_version: PROMPT_VERSION,
          shot_id: shotId,
        })
      } catch (parseErr) {
        if (parseErr instanceof UnsupportedInputError) {
          const body: AnalyzeErrorBody = {
            error: parseErr.message,
            code: "UNSUPPORTED_INPUT",
          }
          return NextResponse.json(body, { status: 422 })
        }
        lastParseErr = parseErr
        console.warn(`[analyze] parse failed (attempt ${attempt + 1}):`, parseErr)
      }
    }
    throw lastParseErr ?? new Error("ANALYSIS_PARSE_FAILED")
  } catch (e) {
    const message = e instanceof Error ? e.message : "분석에 실패했습니다"
    const body: AnalyzeErrorBody = {
      error: message,
      code: "ANALYSIS_FAILED",
    }
    return NextResponse.json(body, { status: 502 })
  }
}
