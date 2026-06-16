import type { SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "shot-images"
const SIGN_TTL_SECONDS = 60 * 60

export function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/shot-images\/([^?]+)/)
  if (!m) return null
  return decodeURIComponent(m[1])
}

export async function shotImageDisplayUrl(
  supabase: SupabaseClient,
  imageUrlOrPath: string
): Promise<string> {
  const path = imageUrlOrPath.startsWith("http")
    ? storagePathFromUrl(imageUrlOrPath)
    : imageUrlOrPath
  if (!path) return imageUrlOrPath
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL_SECONDS)
  return data?.signedUrl ?? imageUrlOrPath
}
