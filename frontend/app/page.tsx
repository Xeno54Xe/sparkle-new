"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BrandLink } from "@/components/ui/brand"
import { MarketOverview } from "@/components/dashboard/market-overview"
import { MarketField } from "@/components/landing/market-field"
import { Reveal } from "@/components/landing/reveal"

const CAPABILITIES = [
  {
    figure: "267",
    title: "Earnings calls and annual reports, read for you",
    body: "Each document is scored on financial health, risk, ESG, management tone and Q&A transparency, with the full summary as a PDF.",
  },
  {
    figure: "15",
    title: "Technical indicators on every stock",
    body: "RSI, MACD, ADX, moving averages, VWAP and candle patterns roll up into one buy, hold or sell score you can screen and compare.",
  },
  {
    figure: "50",
    title: "The whole Nifty 50, live",
    body: "Prices, sector heatmap, financial statements, debt ratios and analyst targets for every constituent, from one search box.",
  },
  {
    figure: "2y",
    title: "Of daily prices behind your portfolio",
    body: "Beta, Jensen's alpha, Sharpe, drawdown and factor scores from real market history, plus pairs that genuinely move together.",
  },
]

const QUESTIONS = [
  "How did Infosys management sound on its latest call?",
  "Compare HDFC Bank and ICICI Bank on valuation",
  "Which Nifty 50 stocks look oversold right now?",
]

export default function LandingPage() {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [question, setQuestion] = useState("")

  useEffect(() => {
    const local = document.cookie.includes("sparkle-local-auth=1")
    createClient().auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user || local))
      .catch(() => setSignedIn(local))
  }, [])

  const ask = (q: string) => {
    const text = q.trim()
    if (!text) return
    router.push(`/ask?q=${encodeURIComponent(text)}`)
  }

  const primaryHref = signedIn ? "/dashboard" : "/signup"
  const primaryLabel = signedIn ? "Open dashboard" : "Create a free account"

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <BrandLink />
          <nav className="flex items-center gap-1 text-sm">
            <a href="#desk" className="hidden h-9 items-center rounded-md px-3 text-muted-foreground transition-colors hover:text-foreground md:flex">What&apos;s inside</a>
            <a href="#ask" className="hidden h-9 items-center rounded-md px-3 text-muted-foreground transition-colors hover:text-foreground md:flex">Ask Sparkle</a>
            <span className="mx-2 hidden h-4 w-px bg-line md:block" aria-hidden="true" />
            {signedIn === null ? (
              <div className="h-9 w-32 animate-pulse rounded-md bg-surface" />
            ) : signedIn ? (
              <Link href="/dashboard" className="btn-lime h-9 px-4">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="flex h-9 items-center rounded-md px-3 text-muted-foreground transition-colors hover:text-foreground">Log in</Link>
                <Link href="/signup" className="btn-lime h-9 px-4">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: the headline on the left, the live field bleeding off the right */}
        <section className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="hero-in relative z-10 pb-4 pt-10 lg:pb-24 lg:pt-16">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(197,255,74,0.8)]" aria-hidden="true" />
                Research desk for India&apos;s top fifty companies
              </p>
              <h1 className="display mt-6 text-[clamp(56px,8.4vw,132px)] text-foreground">
                The Nifty 50,<br />read closely.
              </h1>
              <p className="mt-7 max-w-[440px] text-[17px] leading-relaxed text-muted-foreground">
                Live prices, fifteen technical signals and AI-read earnings calls for every constituent, with a research assistant that cites its sources.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={primaryHref} className="btn-lime group h-12 px-6 text-[15px]">
                  {primaryLabel}
                  <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                {!signedIn && (
                  <Link href="/login" className="flex h-12 items-center rounded-md border border-line-strong px-5 text-[15px] text-foreground transition-colors hover:border-foreground/40 hover:bg-surface">
                    Log in
                  </Link>
                )}
              </div>
            </div>

            <div className="relative -mx-5 h-[440px] sm:mx-0 sm:h-[540px] lg:h-[620px]">
              <div className="field-fit absolute inset-0">
                <MarketField />
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Live market snapshot" className="relative z-10 mx-auto max-w-[1320px] px-5 pb-24 sm:px-8 lg:-mt-6">
          <MarketOverview />
        </section>

        {/* What's inside: sticky statement on the left, the evidence on the right */}
        <section id="desk" className="border-t border-line">
          <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-32">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="display text-[clamp(40px,5vw,72px)] text-foreground">One desk for the whole index.</h2>
              <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
                The work an analyst would do before forming a view, done for every company and kept current through the session.
              </p>
            </div>
            <ul className="border-t border-line">
              {CAPABILITIES.map((c, i) => (
                <Reveal as="li" key={c.title} delay={i * 60} className="group grid grid-cols-[96px_minmax(0,1fr)] gap-6 border-b border-line py-9 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <span className="figure text-[56px] leading-none text-foreground transition-colors duration-300 group-hover:text-primary sm:text-[80px]">{c.figure}</span>
                  <div className="pt-1">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">{c.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{c.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Ask Sparkle: the input is real and opens the assistant */}
        <section id="ask" className="relative overflow-hidden border-t border-line bg-forest/40">
          <div className="ask-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1000px] px-5 py-24 sm:px-8 lg:py-32">
            <Reveal>
              <p className="flex items-center gap-2 text-sm text-primary"><Sparkles size={15} /> Ask Sparkle</p>
              <h2 className="display mt-5 max-w-3xl text-[clamp(40px,5.4vw,80px)] text-foreground">Ask the way you&apos;d ask an analyst.</h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                It checks live prices, technicals and every report on file before it answers, and links each claim to where it came from.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <form
                onSubmit={e => { e.preventDefault(); ask(question) }}
                className="mt-12 flex items-center gap-2 rounded-xl border border-line-strong bg-obsidian/80 p-2 pl-5 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:shadow-[0_0_0_6px_rgba(197,255,74,0.07)]"
              >
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="What did Reliance say about its new energy business?"
                  aria-label="Ask Sparkle a question"
                  className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-faint-foreground focus:outline-none"
                />
                <button type="submit" disabled={!question.trim()} className="btn-lime h-12 shrink-0 px-5 disabled:opacity-40">
                  Ask
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUESTIONS.map(q => (
                  <button key={q} onClick={() => ask(q)} className="rounded-md border border-line bg-surface/60 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {q}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 px-5 py-20 sm:px-8 md:flex-row md:items-end">
            <h2 className="display max-w-2xl text-[clamp(36px,4.4vw,64px)] text-foreground">Open the desk before the opening bell.</h2>
            <Link href={primaryHref} className="btn-lime group h-12 shrink-0 px-6 text-[15px]">
              {primaryLabel}
              <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-5 pt-8 text-xs text-faint-foreground sm:flex-row sm:justify-between sm:px-8">
          <span>SparkleAI. For research and education; not investment advice.</span>
          <span>Market data from Yahoo Finance; may be delayed up to 15 minutes.</span>
        </div>
        <p className="display type-outline pointer-events-none -mb-[0.2em] mt-6 select-none whitespace-nowrap text-center text-[23vw] leading-none" aria-hidden="true">SparkleAI</p>
      </footer>
    </div>
  )
}
