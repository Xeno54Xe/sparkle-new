"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { BrandLink } from "@/components/ui/brand"
import { MarketOverview } from "@/components/dashboard/market-overview"

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
]

export default function LandingPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const local = document.cookie.includes("sparkle-local-auth=1")
    createClient().auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user || local))
      .catch(() => setSignedIn(local))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <BrandLink />
          <nav className="flex items-center gap-2">
            {signedIn === null ? (
              <div className="h-9 w-32 animate-pulse rounded-md bg-surface" />
            ) : signedIn ? (
              <Link href="/dashboard" className="flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">Log in</Link>
                <Link href="/signup" className="flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <section className="py-14 sm:py-20">
          <h1 className="figure max-w-3xl text-[44px] leading-[1.02] text-foreground sm:text-[64px]">
            The Nifty 50, researched while you get on with your day.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            SparkleAI pairs live market data with AI-read earnings calls and annual reports, so you can see what moved, why it matters and what the numbers say in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signedIn ? "/dashboard" : "/signup"} className="flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {signedIn ? "Open dashboard" : "Create a free account"}
            </Link>
            {!signedIn && (
              <Link href="/login" className="flex h-11 items-center rounded-md border border-line px-5 text-sm text-foreground hover:border-line-strong">
                Log in
              </Link>
            )}
          </div>
        </section>

        <section aria-label="Live market snapshot" className="pb-16">
          <MarketOverview />
        </section>

        <section className="grid grid-cols-1 gap-x-10 gap-y-10 border-t border-line py-14 md:grid-cols-3">
          {CAPABILITIES.map(c => (
            <div key={c.title}>
              <p className="figure text-4xl text-primary">{c.figure}</p>
              <h2 className="mt-3 text-base font-medium text-foreground">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-6 text-xs text-faint-foreground sm:flex-row sm:justify-between sm:px-8">
          <span>SparkleAI. For research and education; not investment advice.</span>
          <span>Market data from Yahoo Finance; may be delayed up to 15 minutes.</span>
        </div>
      </footer>
    </div>
  )
}
