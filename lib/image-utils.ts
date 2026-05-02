function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다"))
    img.src = src
  })
}

export async function resizeImageToJpegBase64(
  file: File,
  maxEdge = 1024,
  quality = 0.8
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const { width, height } = img
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas를 사용할 수 없습니다")
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL("image/jpeg", quality)
    const base64 = dataUrl.split(",")[1] ?? ""
    if (!base64) throw new Error("이미지 인코딩에 실패했습니다")
    return { base64, mimeType: "image/jpeg" }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
