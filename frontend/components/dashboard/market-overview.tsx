"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { MarketLoader } from "@/components/ui/market-loader"

interface IndexData {
  symbol: string
  name: string
  value: number
  change_pct: number
  change_abs: number
  is_positive: boolean
}

interface Breadth { up: number; down: number; flat: number }

function formatValue(v: number) {
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function titleCase(name: string) {
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace("Nifty", "Nifty")
}

export function MarketOverview() {
  const [indices, setIndices] = useState<IndexData[]>([])
  const [breadth, setBreadth] = useState<Breadth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [idxRes, heatRes] = await Promise.all([
        fetch(`${API_BASE}/market/indices`, { cache: "no-store" }),
        fetch(`${API_BASE}/market/heatmap`, { cache: "no-store" }).catch(() => null),
      ])
      const json = await idxRes.json()
      if (json.indices?.length) {
        setIndices(json.indices)
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))
      } else {
        setError(true)
      }
      if (heatRes?.ok) {
        const heat = await heatRes.json()
        const stocks: { change_pct: number }[] = heat.stocks || []
        if (stocks.length) {
          setBreadth({
            up: stocks.filter(s => s.change_pct > 0).length,
            down: stocks.filter(s => s.change_pct < 0).length,
            flat: stocks.filter(s => s.change_pct === 0).length,
          })
        }
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const total = breadth ? breadth.up + breadth.down + breadth.flat : 0

  return (
    <section aria-labelledby="market-heading" className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id="market-heading" className="text-sm font-medium text-foreground">Indian markets</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lastUpdated && <span>Updated {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
            aria-label="Refresh market data"
          >
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {error && !loading ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Index prices didn&apos;t load. Check that the backend is running on port 8000.</p>
          <button onClick={fetchData} className="mt-2 text-sm font-medium text-primary hover:underline">Try again</button>
        </div>
      ) : (
        loading && indices.length === 0 ? (
          <MarketLoader variant="compact" label="Nifty 50, Sensex and Bank Nifty" className="min-h-[108px] justify-center" />
        ) : (
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {indices.map((index, i) => (
            <div key={index?.name ?? i} className="px-5 py-5 sm:px-6">
              {index ? (
                <>
                  <p className="text-sm text-muted-foreground">{titleCase(index.name)}</p>
                  <p className="figure mt-2 text-[40px] leading-none text-foreground">{formatValue(index.value)}</p>
                  <p className={cn("mt-2 text-sm font-medium tabular", index.is_positive ? "text-up" : "text-down")}>
                    {index.is_positive ? "▲" : "▼"} {index.is_positive ? "+" : ""}{formatValue(index.change_abs)}
                    <span className="ml-1.5">({index.is_positive ? "+" : ""}{index.change_pct.toFixed(2)}%)</span>
                  </p>
                </>
              ) : null}
            </div>
          ))}
        </div>
        )
      )}

      {breadth && total > 0 && (
        <Link href="/heatmap" className="group block border-t border-line px-5 py-3 transition-colors hover:bg-surface-2/50">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="whitespace-nowrap text-muted-foreground">Nifty 50 breadth</span>
            <span className="whitespace-nowrap tabular">
              <span className="text-up">{breadth.up} up</span>
              <span className="mx-2 text-faint-foreground">/</span>
              <span className="text-down">{breadth.down} down</span>
              <span className="ml-3 hidden text-faint-foreground group-hover:text-muted-foreground sm:inline">View heatmap</span>
            </span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${breadth.up} of ${total} stocks advancing`}>
            <div className="bg-up" style={{ width: `${(breadth.up / total) * 100}%` }} />
            <div className="bg-faint-foreground" style={{ width: `${(breadth.flat / total) * 100}%` }} />
            <div className="bg-down" style={{ width: `${(breadth.down / total) * 100}%` }} />
          </div>
        </Link>
      )}
    </section>
  )
}
