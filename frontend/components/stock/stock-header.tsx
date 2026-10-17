"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Stock } from "@/lib/stocks"

const optionsEnabled = process.env.NEXT_PUBLIC_OPTIONS_STRATEGIES_ENABLED === "true"

const TABS = [
  { label: "Overview", href: "" },
  { label: "Sparkle Report", href: "/sparkle" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "Charts", href: "/charts" },
  { label: "Price history", href: "/prices" },
  { label: "Financials", href: "/financials" },
  { label: "Estimates", href: "/estimates" },
  { label: "Debt & liquidity", href: "/credit-analysis" },
  ...(optionsEnabled ? [{ label: "Options", href: "/options" }] : []),
]

interface LivePrice { price: number; change: number; change_pct: number }

export function StockHeader({ stock }: { stock: Stock }) {
  const pathname = usePathname()
  const base = `/stock/${encodeURIComponent(stock.symbol)}`
  const [live, setLive] = useState<LivePrice | null>(null)
  const { items, addStock, removeStock } = useWatchlist()
  const watched = items.find(i => i.symbol === stock.symbol)

  useEffect(() => {
    let cancelled = false
    setLive(null)
    fetch(`${API_BASE}/price/${encodeURIComponent(stock.symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled && j && typeof j.price === "number") setLive(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [stock.symbol])

  const up = (live?.change_pct ?? 0) >= 0
  const decodedPath = decodeURIComponent(pathname)
  const isActive = (href: string) =>
    href === "" ? decodedPath === `/stock/${stock.symbol}` : decodedPath === `/stock/${stock.symbol}${href}`

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <StockLogo symbol={stock.symbol} size={44} className="rounded-lg" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5">
                <h1 className="text-xl font-semibold text-foreground">{stock.symbol}</h1>
                <span className="text-sm text-muted-foreground">NSE</span>
              </div>
              <p className="flex min-w-0 gap-3 text-sm">
                <span className="truncate text-muted-foreground">{stock.name}</span>
                <span className="shrink-0 text-faint-foreground">{stock.sector}</span>
              </p>
            </div>
          </div>

          <div className="flex items-end gap-5">
            <div className="text-left sm:text-right">
              {live ? (
                <>
                  <p className="figure text-[28px] leading-none text-foreground">
                    ₹{live.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={cn("mt-1.5 text-sm font-medium tabular", up ? "text-up" : "text-down")}>
                    {up ? "▲" : "▼"} {up ? "+" : ""}{live.change.toFixed(2)} ({up ? "+" : ""}{live.change_pct.toFixed(2)}%)
                  </p>
                </>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="ml-auto h-7 w-36 rounded bg-surface-2" />
                  <div className="ml-auto h-3.5 w-24 rounded bg-surface-2" />
                </div>
              )}
            </div>
            <button
              onClick={() => (watched ? removeStock(watched.id) : addStock(stock.symbol, stock.name))}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                watched
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground"
              )}
              aria-pressed={!!watched}
            >
              <Star size={15} className={cn(watched && "fill-primary")} />
              {watched ? "Watching" : "Watch"}
            </button>
          </div>
        </div>

        <nav className="-mb-px mt-5 flex gap-1 overflow-x-auto scrollbar-none" aria-label={`${stock.symbol} sections`}>
          {TABS.map(tab => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.label}
                href={`${base}${tab.href}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
