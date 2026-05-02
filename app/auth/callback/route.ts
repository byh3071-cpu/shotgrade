import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabaseDbOptions } from "@/lib/supabase/db"

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextPath = searchParams.get("next") ?? "/"

  if (!url || !key) {
    return NextResponse.redirect(`${origin}/?error=supabase`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(url, key, {
      ...supabaseDbOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${nextPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
