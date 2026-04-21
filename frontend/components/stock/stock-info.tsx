"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"
import type { Stock } from "@/lib/stocks"

interface StockInfoProps { stock: Stock }

export function StockInfo({ stock }: StockInfoProps) {
  const isPositive = stock.change >= 0
  const priceChangeAmount = (stock.price * stock.change) / 100

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
        <p className="mb-1 text-sm text-muted-foreground">Current Price</p>
        <div className="flex items-end gap-4">
          <span className="text-3xl font-bold text-foreground">
            {stock.price.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="text-sm font-semibold">{isPositive ? "+" : ""}{stock.change.toFixed(2)}%</span>
          </div>
          <span className={`text-sm ${isPositive ? "text-primary" : "text-destructive"}`}>
            ({isPositive ? "+" : ""}{priceChangeAmount.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })})
          </span>
        </div>
      </div>

    </div>
  )
}
