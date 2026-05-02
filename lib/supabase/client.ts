import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { supabaseDbOptions } from "@/lib/supabase/db"

let browser: SupabaseClient | null = null

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!browser) {
    browser = createBrowserClient(url, key, supabaseDbOptions) as unknown as SupabaseClient
  }
  return browser
}
