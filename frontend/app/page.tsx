"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, BarChart2, Brain, FileText, TrendingUp, Zap, Shield, ChevronRight, Activity, LayoutDashboard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const features = [
  {
    icon: Brain,
    title: "Fundamental Analysis",
    desc: "AI-analyzed earnings calls and annual reports for all 55 Nifty 50 companies. Scored across 7 dimensions — financial metrics, ESG, risk, sentiment and more.",
    color: "#34D399",
  },
  {
    icon: BarChart2,
    title: "Technical Analysis",
    desc: "12+ real-time indicators including RSI, MACD, Bollinger Bands, candlestick patterns and MA crossovers. Get a live verdict in seconds.",
    color: "#60A5FA",
  },
  {
    icon: FileText,
    title: "AI Research Reports",
    desc: "267 PDF research reports across earnings calls and annual reports — all structured, searchable and downloadable in one place.",
    color: "#A78BFA",
  },
  {
    icon: Activity,
    title: "Live Market Intelligence",
    desc: "Real-time stock prices, curated market news, sector updates and key metrics — everything you need to stay ahead of the market.",
    color: "#F59E0B",
  },
]

const stats = [
  { value: "55", label: "Nifty 50 Companies" },
  { value: "267", label: "Research Reports" },
  { value: "500+", label: "AI Analyses" },
  { value: "12+", label: "Technical Indicators" },
]

export default function LandingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      setAuthChecked(true)
    })
  }, [])

  const isLoggedIn = authChecked && userEmail !== null

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Background glow ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-white/5 backdrop-blur-md bg-background/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
            <Zap size={16} className="text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gradient-primary">SparkleAI</span>
        </div>
        <nav className="flex items-center gap-3">
          {!authChecked ? (
            // Skeleton while checking auth — prevents layout shift
            <div className="h-9 w-36 rounded-xl bg-white/5 animate-pulse" />
          ) : isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:scale-[1.03]"
            >
              <LayoutDashboard size={15} />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:scale-[1.03]"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-8 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Nifty 50 · Live Data · AI-Powered
        </div>

        <h1 className="max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Stock Intelligence{" "}
          <span className="text-gradient-primary">Powered by AI</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
          Fundamental analysis, technical signals, and AI research reports for all 55 Nifty 50 companies —
          in one beautifully crafted platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.45)] hover:scale-[1.03]"
              >
                <LayoutDashboard size={18} />
                Go to Dashboard
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-sm text-muted-foreground">
                Welcome back, <span className="text-foreground font-semibold">{userEmail}</span>
              </p>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.45)] hover:scale-[1.03]"
              >
                Start for Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 bg-white/5 text-foreground font-semibold text-base hover:bg-white/10 transition-all"
              >
                Log in <ChevronRight size={18} className="text-muted-foreground" />
              </Link>
            </>
          )}
        </div>

        {/* Hero visual — mock dashboard card */}
        <div className="relative mt-20 w-full max-w-4xl mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
          <div className="relative glass-card rounded-2xl border border-white/10 p-6 overflow-hidden">
            {/* Fake dashboard header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">RELIANCE</p>
                  <p className="text-xs text-muted-foreground">Reliance Industries</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">₹2,847.50</p>
                <p className="text-xs font-semibold text-primary">+1.23%</p>
              </div>
            </div>
            {/* Fake bars */}
            <div className="grid grid-cols-7 gap-1.5 h-20 items-end mb-4">
              {[45, 62, 55, 78, 68, 85, 72].map((h, i) => (
                <div key={i} className="rounded-sm" style={{ height: `${h}%`, backgroundColor: i === 6 ? "#34D399" : `rgba(52,211,153,${0.2 + i * 0.08})` }} />
              ))}
            </div>
            {/* Fake metric chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { l: "RSI", v: "58.4", c: "#FBBF24" },
                { l: "MACD", v: "Bullish", c: "#34D399" },
                { l: "Signal", v: "BUY", c: "#34D399" },
                { l: "Verdict", v: "72 / 100", c: "#34D399" },
              ].map(m => (
                <div key={m.l} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{m.l}</span>
                  <span className="text-xs font-bold" style={{ color: m.c }}>{m.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 py-16 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold text-gradient-primary mb-1">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="text-gradient-primary">invest smarter</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built specifically for Indian markets, SparkleAI combines AI analysis with real market data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group glass-card rounded-2xl p-6 border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 border"
                  style={{ backgroundColor: f.color + "15", borderColor: f.color + "30" }}
                >
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative glass-card rounded-3xl border border-primary/20 p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
                {isLoggedIn ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Welcome back</>
                ) : (
                  <><Shield size={12} /> Free to get started</>
                )}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                {isLoggedIn ? (
                  <>Your dashboard is <span className="text-gradient-primary">ready.</span></>
                ) : (
                  <>Ready to invest with <span className="text-gradient-primary">intelligence?</span></>
                )}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                {isLoggedIn
                  ? "You're already signed in. Jump straight back into your AI-powered stock analysis."
                  : "Join thousands of investors using AI-powered insights to make better decisions on Indian markets."}
              </p>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.03]"
                >
                  <LayoutDashboard size={18} />
                  Go to Dashboard
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.03]"
                >
                  Create Free Account
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap size={14} className="text-primary" />
          <span className="font-semibold text-foreground">SparkleAI</span>
        </div>
        <p>AI-powered stock intelligence for Nifty 50 · For educational purposes only</p>
      </footer>
    </div>
  )
}
