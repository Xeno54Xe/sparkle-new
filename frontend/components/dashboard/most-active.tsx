"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockLogo } from "@/components/ui/stock-logo"
import { Panel, PanelHeader, PanelAction, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"

interface ActiveStock {
  rank: number
  symbol: string
  name: string
  price: number
  change_pct: number
  is_positive: boolean
  volume_fmt: string
}

export function MostActive() {
  const [stocks, setStocks] = useState<ActiveStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_BASE}/market/most-active`, { cache: "no-store" })
      const json = await res.json()
      if (json.stocks?.length) setStocks(json.stocks)
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <Panel aria-label="Most active stocks">
      <PanelHeader
        title="Most active"
        description="By traded volume, last session"
        actions={
          <PanelAction onClick={fetchData} disabled={loading} aria-label="Refresh most active">
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
          </PanelAction>
        }
      />
      {loading && stocks.length === 0 ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i} className="flex animate-pulse items-center gap-3 px-5 py-3">
              <div className="h-7 w-7 rounded-md bg-surface-2" />
              <div className="flex-1 space-y-1.5"><div className="h-3 w-20 rounded bg-surface-2" /><div className="h-2.5 w-14 rounded bg-surface-2" /></div>
              <div className="h-3 w-16 rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <EmptyState title="Volume data didn't load" action={<button onClick={fetchData} className="text-sm font-medium text-primary hover:underline">Try again</button>} />
      ) : (
        <ul className="divide-y divide-line">
          {stocks.map(stock => (
            <li key={stock.symbol}>
              <Link href={`/stock/${stock.symbol}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                <span className="w-3 text-xs tabular text-faint-foreground">{stock.rank}</span>
                <StockLogo symbol={stock.symbol} size={28} className="rounded-md" isPositive={stock.is_positive} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{stock.symbol}</span>
                  <span className="block text-xs text-muted-foreground">{stock.volume_fmt} shares</span>
                </span>
                <span className="text-right tabular">
                  <span className="block text-sm text-foreground">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={cn("block text-xs", stock.is_positive ? "text-up" : "text-down")}>
                    {stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
