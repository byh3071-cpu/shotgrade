"use client"

import { useCallback, useRef, useState } from "react"
import { resizeImageToJpegBase64 } from "@/lib/image-utils"
import { cn } from "@/lib/utils"

type Tab = "camera" | "gallery"

type Props = {
  onCapture: (base64: string, mimeType: string) => void
  className?: string
}

export function CameraCapture({ onCapture, className }: Props) {
  const [tab, setTab] = useState<Tab>("camera")
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      const resized = await resizeImageToJpegBase64(file)
      setPreview(`data:image/jpeg;base64,${resized.base64}`)
      onCapture(resized.base64, resized.mimeType)
    },
    [onCapture]
  )

  const onChangeInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      await handleFile(file ?? null)
      e.target.value = ""
    },
    [handleFile]
  )

  const triggerPick = () => inputRef.current?.click()

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex rounded-lg bg-muted/40 p-1 ring-1 ring-border">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            tab === "camera"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setTab("camera")}
        >
          촬영
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            tab === "gallery"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setTab("gallery")}
        >
          갤러리
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={tab === "camera" ? "environment" : undefined}
        className="hidden"
        onChange={onChangeInput}
      />

      <button
        type="button"
        onClick={triggerPick}
        className="relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-upload preview
          <img src={preview} alt="선택한 샷 미리보기" className="max-h-72 w-full object-contain" />
        ) : (
          <span className="text-sm">📷 탭하여 촬영하거나 이미지를 선택하세요</span>
        )}
      </button>
    </div>
  )
}
