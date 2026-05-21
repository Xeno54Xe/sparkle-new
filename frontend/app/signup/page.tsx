"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Zap, BarChart2, Brain, FileText, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const highlights = [
  { icon: Brain, text: "AI-analyzed earnings calls & annual reports" },
  { icon: BarChart2, text: "Live technical indicators for every Nifty 50 stock" },
  { icon: FileText, text: "267 downloadable AI research reports" },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColors = ["", "#EF4444", "#FBBF24", "#34D399"]
  const strengthLabels = ["", "Weak", "Fair", "Strong"]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/dashboard` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <CheckCircle2 size={40} className="text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-foreground font-semibold">{email}</span>.
              Click it to activate your account and access your dashboard.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
          >
            Back to login <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/6 blur-[120px] pointer-events-none" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5 w-fit">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <Zap size={18} className="text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gradient-primary">SparkleAI</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">
              Start investing<br />
              <span className="text-gradient-primary">with AI clarity</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
              Get instant access to AI-powered fundamental and technical analysis for all Nifty 50 stocks.
            </p>
          </div>

          <div className="space-y-4">
            {highlights.map(h => (
              <div key={h.text} className="flex items-center gap-4 glass-card rounded-xl px-5 py-4 border border-white/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <h.icon size={16} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl border border-primary/15 bg-primary/5 px-5 py-4">
            <p className="text-sm font-semibold text-primary mb-1">Free forever</p>
            <p className="text-xs text-muted-foreground">No credit card required. Full access on signup.</p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground/50">
          SparkleAI · AI-powered · For educational purposes only
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
              <Zap size={14} className="text-primary" />
            </div>
            <span className="text-base font-bold text-gradient-primary">SparkleAI</span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold mb-2">Create account</h1>
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ backgroundColor: i <= passwordStrength ? strengthColors[passwordStrength] : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColors[passwordStrength] }}>{strengthLabels[passwordStrength]}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:scale-[1.02]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>Create account <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
