"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AuthButton() {
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(() => supabase === null)

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setInitialized(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])

  if (!supabase) {
    return (
      <Button type="button" variant="ghost" size="sm" disabled title="Supabase 환경 변수 필요">
        👤
      </Button>
    )
  }

  const signIn = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (!initialized) {
    return (
      <Button type="button" variant="ghost" size="sm" disabled>
        …
      </Button>
    )
  }

  if (email) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
        로그아웃
      </Button>
    )
  }

  return (
    <Button type="button" variant="default" size="sm" onClick={() => void signIn()}>
      Google 로그인
    </Button>
  )
}
