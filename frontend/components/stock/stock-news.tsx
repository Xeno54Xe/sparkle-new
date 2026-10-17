"use client"

import { useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { MarketLoader } from "@/components/ui/market-loader"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Stock } from "@/lib/stocks"

type Tone = "positive" | "negative" | "neutral"

interface Article {
  title: string
  link: string
  source: string
  time: string
  tone: Tone
}

interface NewsResponse {
  articles: Article[]
  lookback_days?: number
  mood?: { positive: number; negative: number; neutral: number; label: string }
  error?: string
}

const TONE: Record<Tone, { label: string; icon: typeof Minus; className: string }> = {
  positive: { label: "Positive", icon: ArrowUpRight, className: "text-up" },
  negative: { label: "Negative", icon: ArrowDownRight, className: "text-down" },
  neutral: { label: "Neutral", icon: Minus, className: "text-muted-foreground" },
}

function ToneTag({ tone }: { tone: Tone }) {
  const t = TONE[tone] ?? TONE.neutral
  const Icon = t.icon
  return (
    <span className={cn("inline-flex items-center gap-0.5", t.className)}>
      <Icon size={12} aria-hidden /> {t.label}
    </span>
  )
}

export function StockNews({ stock }: { stock: Stock }) {
  const [data, setData] = useState<NewsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(null)
    fetch(`${API_BASE}/news/stock/${encodeURIComponent(stock.symbol)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: NewsResponse | null) => {
        if (cancelled) return
        // An error with no articles means the feed couldn't be read, not that there is no news.
        setData(j && Array.isArray(j.articles) && !(j.error && j.articles.length === 0) ? j : null)
      })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stock.symbol])

  const articles = data?.articles ?? []
  const mood = data?.mood
  const days = data?.lookback_days ?? 7

  return (
    <Panel aria-label={`${stock.symbol} news`}>
      <PanelHeader
        title={`${stock.name} in the news`}
        description={`Headlines naming the company, last ${days} days`}
        actions={mood && articles.length > 0 ? (
          <span className="tabular">
            {mood.label}
            <span className="ml-2 hidden text-faint-foreground sm:inline">
              {mood.positive} positive · {mood.negative} negative · {mood.neutral} neutral
            </span>
          </span>
        ) : undefined}
      />
      {loading ? (
        <MarketLoader variant="compact" label={`news about ${stock.symbol}`} className="min-h-[120px] justify-center" />
      ) : !data ? (
        <EmptyState title="News didn't load">The news feed couldn&apos;t be reached. Try again in a few minutes.</EmptyState>
      ) : articles.length === 0 ? (
        <EmptyState title="No recent headlines">Nothing naming {stock.name} in the last {days} days.</EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {articles.map((a, i) => (
              <li key={`${a.link}-${i}`}>
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block px-5 py-3.5 transition-colors hover:bg-surface-2/60"
                >
                  <p className="text-[15px] leading-snug text-foreground group-hover:text-primary">{a.title}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <ToneTag tone={a.tone} />
                    <span>{a.source}</span>
                    <span className="text-faint-foreground">{a.time}</span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-2.5 text-xs text-faint-foreground">
            Tone is a quick estimate from the words in each headline. The Sparkle Report scores news in depth.
          </p>
        </>
      )}
    </Panel>
  )
}
