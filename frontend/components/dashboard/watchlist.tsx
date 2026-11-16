"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { StockLogo } from "@/components/ui/stock-logo"
import { NewBadge } from "@/components/ui/new-badge"
import { useFreshReports } from "@/lib/hooks/useFreshReports"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Quote { price: number; change_pct: number }

export function Watchlist() {
  const { items, loading } = useWatchlist()
  const preview = items.slice(0, 6)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const fresh = useFreshReports()
  const symbolsKey = preview.map(i => i.symbol).join(",")

  // Live quotes for the visible rows
  useEffect(() => {
    if (!symbolsKey) return
    let cancelled = false
    Promise.all(symbolsKey.split(",").map(sym =>
      fetch(`${API_BASE}/price/${encodeURIComponent(sym)}.NS`)
        .then(r => (r.ok ? r.json() : null))
        .then(j => [sym, j && typeof j.price === "number" ? j : null] as const)
        .catch(() => [sym, null] as const)
    )).then(rows => {
      if (cancelled) return
      const next: Record<string, Quote> = {}
      rows.forEach(([sym, q]) => { if (q) next[sym] = q })
      setQuotes(next)
    })
    return () => { cancelled = true }
  }, [symbolsKey])

  return (
    <Panel aria-label="Your watchlist">
      <PanelHeader
        title="Watchlist"
        actions={<Link href="/watchlist" className="rounded-md px-2 py-1 transition-colors hover:bg-surface-2 hover:text-foreground">{items.length > 0 ? "Manage" : "Add stocks"}</Link>}
      />
      {loading ? (
        <div className="space-y-3 px-5 py-4">
          {[0, 1, 2].map(i => <div key={i} className="h-8 animate-pulse rounded bg-surface-2" />)}
        </div>
      ) : preview.length === 0 ? (
        <EmptyState
          title="Nothing on your watchlist"
          action={<Link href="/watchlist" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Add stocks</Link>}
        >
          Track the stocks you care about and see their live moves here.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {preview.map(item => {
            const q = quotes[item.symbol]
            const up = (q?.change_pct ?? 0) >= 0
            return (
              <li key={item.id}>
                <Link href={`/stock/${item.symbol}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                  <StockLogo symbol={item.symbol} size={28} className="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">{item.symbol}<NewBadge reports={fresh[item.symbol]} /></span>
                    <span className="block truncate text-xs text-muted-foreground">{item.name}</span>
                  </span>
                  <span className="text-right tabular">
                    {q ? (
                      <>
                        <span className="block text-sm text-foreground">₹{q.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        <span className={cn("block text-xs", up ? "text-up" : "text-down")}>{up ? "+" : ""}{q.change_pct.toFixed(2)}%</span>
                      </>
                    ) : (
                      <span className="block h-3 w-14 animate-pulse rounded bg-surface-2" />
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
          {items.length > preview.length && (
            <li>
              <Link href="/watchlist" className="block px-5 py-2.5 text-center text-xs text-muted-foreground hover:bg-surface-2/60 hover:text-foreground">
                View all {items.length}
              </Link>
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}
