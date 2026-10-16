"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"
import type { Stock } from "@/lib/stocks"
import { API_BASE } from "@/lib/api"

interface StockInfoProps { stock: Stock }

interface LivePrice { price: number; change: number; change_pct: number }

export function StockInfo({ stock }: StockInfoProps) {
  const [live, setLive] = useState<LivePrice | null>(null)

  useEffect(() => {
    let cancelled = false
    setLive(null)
    fetch(`${API_BASE}/price/${encodeURIComponent(stock.symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled && j && typeof j.price === "number") setLive(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [stock.symbol])

  // Fall back to the bundled snapshot until (or unless) the live quote arrives
  const price = live?.price ?? stock.price
  const changePct = live?.change_pct ?? stock.change
  const isPositive = changePct >= 0
  const priceChangeAmount = live?.change ?? (stock.price * stock.change) / 100

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StockLogo symbol={stock.symbol} size={48} isPositive={isPositive} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{stock.symbol}</h1>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{stock.sector}</span>
      </div>

      <div className="mb-6 rounded-lg bg-secondary/50 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Price{live ? "" : " (snapshot)"}</p>
        <div className="flex items-end gap-4">
          <span className="text-3xl font-bold text-foreground">
            {price.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="text-sm font-semibold">{isPositive ? "+" : ""}{changePct.toFixed(2)}%</span>
          </div>
          <span className={`text-sm ${isPositive ? "text-primary" : "text-destructive"}`}>
            ({isPositive ? "+" : ""}{priceChangeAmount.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })})
          </span>
        </div>
      </div>

    </div>
  )
}
