"use client"

import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockLogo } from "@/components/ui/stock-logo"
import Link from "next/link"

interface ActiveStock {
  rank: number
  symbol: string
  name: string
  price: number
  change_pct: number
  is_positive: boolean
  volume_fmt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export function MostActive() {
  const [stocks, setStocks] = useState<ActiveStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_URL}/market/most-active`, { cache: "no-store" })
      const json = await res.json()
      if (json.stocks?.length) {
        setStocks(json.stocks)
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
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#FBBF24]" />
          <span className="text-sm font-semibold text-foreground">Most Active</span>
        </div>
        <button
          onClick={fetchData}
          className="text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          Refresh
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="h-6 w-6 rounded bg-white/10 shrink-0" />
              <div className="h-7 w-7 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-2.5 w-14 rounded bg-white/10" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="h-2.5 w-10 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load active stocks.</p>
          <button onClick={fetchData} className="mt-2 text-xs text-primary hover:underline">Try again</button>
        </div>
      )}

      {/* Live data */}
      {!loading && !error && (
        <div className="divide-y divide-border">
          {stocks.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
            >
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                stock.rank <= 3 ? "bg-[#FBBF24]/20 text-[#FBBF24]" : "bg-secondary text-muted-foreground"
              )}>
                {stock.rank}
              </div>
              <StockLogo symbol={stock.symbol} size={28} isPositive={stock.is_positive} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-foreground">{stock.symbol}</span>
                <span className="truncate text-xs text-muted-foreground">Vol: {stock.volume_fmt}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">
                  ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={cn("text-xs font-medium", stock.is_positive ? "text-primary" : "text-destructive")}>
                  {stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
