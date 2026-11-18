"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { AuthLayout, authInput, authButton } from "@/components/auth/auth-layout"
import { cn } from "@/lib/utils"

const LOCAL_AUTH_COOKIE = "sparkle-local-auth"
const LOCAL_AUTH_EMAIL = "sparkle-local-email"
const localBypass = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH_BYPASS === "true"

const STRENGTH = [
  { label: "", bar: "bg-surface-2", text: "" },
  { label: "Too short", bar: "bg-down", text: "text-down" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Strong", bar: "bg-up", text: "text-up" },
]

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) { setError("Use at least 6 characters for your password."); return }
    if (password !== confirm) { setError("The two passwords don't match."); return }
    setLoading(true)
    let signupError: string | null = null
    try {
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/dashboard` },
      })
      signupError = error?.message ?? null
    } catch {
      signupError = "The sign-up service didn't respond. Try again in a moment."
    }

    if (localBypass) {
      // Local development: no email confirmation, go straight in on this device
      document.cookie = `${LOCAL_AUTH_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`
      window.localStorage.setItem(LOCAL_AUTH_EMAIL, email)
      router.push("/dashboard")
      router.refresh()
      return
    }
    if (signupError) { setError(signupError); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthLayout>
        <h1 className="display text-[40px] text-foreground">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it to activate your account, then log in.
        </p>
        <Link href="/login" className={cn(authButton, "mt-8")}>Go to log in</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="display text-[40px] text-foreground">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Already have one? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
      </p>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-foreground">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={authInput} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-foreground">Password</label>
          <div className="relative">
            <input id="password" type={showPwd ? "text" : "password"} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} className={`${authInput} pr-11`} aria-describedby="pwd-strength" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={showPwd ? "Hide password" : "Show password"}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div id="pwd-strength" className="flex items-center gap-2 pt-1">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map(i => <div key={i} className={cn("h-1 flex-1 rounded-full", i <= strength ? STRENGTH[strength].bar : "bg-surface-2")} />)}
            </div>
            <span className={cn("w-16 text-right text-xs", STRENGTH[strength].text)}>{STRENGTH[strength].label}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm text-foreground">Confirm password</label>
          <input id="confirm" type={showPwd ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={authInput} />
        </div>

        {error && <p role="alert" className="rounded-md border border-down/30 bg-down/10 px-3.5 py-2.5 text-sm text-down">{error}</p>}

        <button type="submit" disabled={loading} className={authButton}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-faint-foreground">
        By creating an account you agree to the Terms of Service and Privacy Policy.
      </p>
    </AuthLayout>
  )
}
