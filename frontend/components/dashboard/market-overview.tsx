"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface IndexData {
  symbol: string
  name: string
  value: number
  change_pct: number
  change_abs: number
  is_positive: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function formatValue(v: number) {
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MarketOverview() {
  const [indices, setIndices] = useState<IndexData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_URL}/market/indices`, { cache: "no-store" })
      const json = await res.json()
      if (json.indices?.length) {
        setIndices(json.indices)
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-foreground">Market Overview</span>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-40"
          >
            <RefreshCw size={11} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl glass-card border-white/10 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded bg-white/10" />
                  <div className="h-6 w-28 rounded bg-white/10" />
                  <div className="h-4 w-14 rounded bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error fallback */}
      {!loading && error && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load market data.</p>
          <button onClick={fetchData} className="mt-2 text-xs text-primary hover:underline">Try again</button>
        </div>
      )}

      {/* Live data */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {indices.map((index) => (
            <div
              key={index.name}
              className="group flex flex-col justify-center gap-4 rounded-2xl glass-card border-white/10 p-5 glass-card-hover relative overflow-hidden"
            >
              {/* Subtle gradient orb */}
              <div className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40",
                index.is_positive ? "bg-primary" : "bg-destructive"
              )} />

              <div className="flex items-center gap-4 relative z-10">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-lg transition-transform duration-300 group-hover:scale-110",
                  index.is_positive
                    ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-primary/20"
                    : "bg-destructive/20 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-destructive/20"
                )}>
                  {index.symbol}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{index.name}</span>
                  <span className="text-2xl font-bold text-foreground tracking-tight">
                    {formatValue(index.value)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                      index.is_positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    )}>
                      {index.is_positive
                        ? <TrendingUp size={12} />
                        : <TrendingDown size={12} />
                      }
                      {index.is_positive ? "+" : ""}{index.change_pct.toFixed(2)}%
                    </span>
                    <span className={cn("text-xs", index.is_positive ? "text-primary/60" : "text-destructive/60")}>
                      ({index.is_positive ? "+" : ""}{formatValue(index.change_abs)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
