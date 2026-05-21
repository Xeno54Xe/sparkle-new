"use client"

import Link from "next/link"
import { Star, Plus, Loader2 } from "lucide-react"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { nifty50Stocks } from "@/lib/stocks"

export function Watchlist() {
  const { items, loading } = useWatchlist()

  // Show up to 5 items in the dashboard widget
  const preview = items.slice(0, 5)

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Watchlist</span>
        </div>
        <Link
          href="/watchlist"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Manage watchlist"
        >
          <Plus size={16} />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : preview.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">No stocks in your watchlist yet.</p>
          <Link
            href="/watchlist"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Plus size={13} /> Add stocks
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {preview.map(item => {
              const meta = nifty50Stocks.find(s => s.symbol === item.symbol)
              const isPositive = (meta?.change ?? 0) >= 0
              return (
                <Link
                  key={item.id}
                  href={`/stock/${item.symbol}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50 group"
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold border transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: isPositive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                      borderColor: isPositive ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)",
                      color: isPositive ? "#34D399" : "#F87171",
                    }}
                  >
                    {item.symbol.slice(0, 2)}
                  </div>

                  {/* Name */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.symbol}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.name}</span>
                  </div>

                  {/* Change badge */}
                  {meta && (
                    <span className={`text-xs font-semibold shrink-0 ${isPositive ? "text-primary" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}{meta.change.toFixed(2)}%
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-border p-3 text-center">
            <Link href="/watchlist" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              {items.length > 5 ? `View all ${items.length} stocks` : "Manage watchlist"}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
