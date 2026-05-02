import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { parseAnalysisJson } from "@/lib/analyze"
import {
  ANALYSIS_MODEL,
  MAX_TOKENS,
  SHOT_ANALYSIS_PROMPT,
} from "@/lib/prompts"
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

  const anthropic = new Anthropic({ apiKey })

  try {
    const msg = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: MAX_TOKENS,
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
            {
              type: "text",
              text: SHOT_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    })

    const textBlocks = msg.content.filter((b) => b.type === "text")
    const raw = textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n")

    if (!raw.trim()) {
      const body: AnalyzeErrorBody = {
        error: "모델 응답이 비어 있습니다",
        code: "EMPTY_MODEL_OUTPUT",
      }
      return NextResponse.json(body, { status: 502 })
    }

    const analysis = parseAnalysisJson(raw)
    return NextResponse.json(analysis)
  } catch (e) {
    const message = e instanceof Error ? e.message : "분석에 실패했습니다"
    const body: AnalyzeErrorBody = {
      error: message,
      code: "ANALYSIS_FAILED",
    }
    return NextResponse.json(body, { status: 502 })
  }
}
