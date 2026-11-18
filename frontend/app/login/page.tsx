"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { AuthLayout, authInput, authButton } from "@/components/auth/auth-layout"

const LOCAL_AUTH_COOKIE = "sparkle-local-auth"
const LOCAL_AUTH_EMAIL = "sparkle-local-email"

function localAuthBypassEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH_BYPASS === "true" && typeof window !== "undefined"
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    let loginError: Error | null = null
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      loginError = error
    } catch (err) {
      loginError = err instanceof Error ? err : new Error("The sign-in service didn't respond. Try again in a moment.")
    }

    if (localAuthBypassEnabled()) {
      // Local development: sign in on this device even without Supabase
      document.cookie = `${LOCAL_AUTH_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`
      window.localStorage.setItem(LOCAL_AUTH_EMAIL, email)
    } else if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <AuthLayout>
      <h1 className="display text-[40px] text-foreground">Log in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        New to SparkleAI? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-foreground">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={authInput} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-foreground">Password</label>
          <div className="relative">
            <input id="password" type={showPwd ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className={`${authInput} pr-11`} />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={showPwd ? "Hide password" : "Show password"}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="rounded-md border border-down/30 bg-down/10 px-3.5 py-2.5 text-sm text-down">{error}</p>}

        <button type="submit" disabled={loading} className={authButton}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-faint-foreground">
        By continuing you agree to the Terms of Service and Privacy Policy.
      </p>
    </AuthLayout>
  )
}
