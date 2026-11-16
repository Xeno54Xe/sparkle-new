"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { MarketLoader } from "@/components/ui/market-loader"

interface StockTile {
  symbol: string
  name: string
  sector: string
  price: number
  change_pct: number
}

// Diverging scale built from the theme's up/down colours. Intensity steps at
// 0.5%, 1.5% and 3% so a quiet day still shows shape.
const UP_STEPS = [
  { min: 3, bg: "rgba(47,181,124,0.85)", fg: "#06140d" },
  { min: 1.5, bg: "rgba(47,181,124,0.60)", fg: "#e6f6ee" },
  { min: 0.5, bg: "rgba(47,181,124,0.38)", fg: "#e6f6ee" },
  { min: 0, bg: "rgba(47,181,124,0.18)", fg: "#9adfbf" },
]
const DOWN_STEPS = [
  { max: -3, bg: "rgba(227,93,91,0.85)", fg: "#1a0707" },
  { max: -1.5, bg: "rgba(227,93,91,0.60)", fg: "#fbeaea" },
  { max: -0.5, bg: "rgba(227,93,91,0.38)", fg: "#fbeaea" },
  { max: 0, bg: "rgba(227,93,91,0.18)", fg: "#f0a9a8" },
]

function tileStyle(pct: number) {
  if (pct > 0) return UP_STEPS.find(s => pct >= s.min) ?? UP_STEPS[UP_STEPS.length - 1]
  if (pct < 0) return DOWN_STEPS.find(s => pct <= s.max) ?? DOWN_STEPS[DOWN_STEPS.length - 1]
  return { bg: "var(--surface-2)", fg: "var(--muted-foreground)" }
}

const LEGEND = [
  { label: "−3%", pct: -3 }, { label: "", pct: -1.5 }, { label: "", pct: -0.5 }, { label: "", pct: -0.1 },
  { label: "0", pct: 0 },
  { label: "", pct: 0.1 }, { label: "", pct: 0.5 }, { label: "", pct: 1.5 }, { label: "+3%", pct: 3 },
]

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>Daily change</span>
      <div className="flex items-start gap-px" aria-hidden="true">
        {LEGEND.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-2.5 w-7" style={{ backgroundColor: tileStyle(s.pct).bg }} />
            <span className="h-3 text-[10px] tabular text-faint-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tile({ stock }: { stock: StockTile }) {
  const s = tileStyle(stock.change_pct)
  const sign = stock.change_pct > 0 ? "+" : ""
  return (
    <Link
      href={`/stock/${encodeURIComponent(stock.symbol)}`}
      title={`${stock.name}: ₹${stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
      className="flex h-16 flex-col justify-center rounded-md px-2.5 outline-offset-1 transition-[filter] hover:brightness-125"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="truncate text-xs font-semibold">{stock.symbol}</span>
      <span className="mt-0.5 text-[13px] font-medium tabular">{sign}{stock.change_pct.toFixed(2)}%</span>
    </Link>
  )
}

function avg(list: StockTile[]) {
  return list.reduce((s, st) => s + st.change_pct, 0) / (list.length || 1)
}

type SortMode = "sector" | "gainers" | "losers"
const SORTS: { id: SortMode; label: string }[] = [
  { id: "sector", label: "By sector" },
  { id: "gainers", label: "Top gainers" },
  { id: "losers", label: "Top losers" },
]

export default function HeatmapPage() {
  const [stocks, setStocks] = useState<StockTile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sortBy, setSortBy] = useState<SortMode>("sector")

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/market/heatmap`, { cache: "no-store" })
      if (!res.ok) throw new Error(`The market data service answered ${res.status}.`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStocks(data.stocks || [])
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Market data didn't load.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const gainers = stocks.filter(s => s.change_pct > 0).length
  const losers = stocks.filter(s => s.change_pct < 0).length
  const marketAvg = avg(stocks)

  const groups = (() => {
    if (sortBy !== "sector") {
      const sorted = [...stocks].sort((a, b) => (sortBy === "gainers" ? b.change_pct - a.change_pct : a.change_pct - b.change_pct))
      return [{ sector: sortBy === "gainers" ? "All 50, best first" : "All 50, worst first", stocks: sorted }]
    }
    const grouped: Record<string, StockTile[]> = {}
    stocks.forEach(s => { (grouped[s.sector] ||= []).push(s) })
    return Object.entries(grouped)
      .map(([sector, list]) => ({ sector, stocks: list.sort((a, b) => b.change_pct - a.change_pct) }))
      .sort((a, b) => avg(b.stocks) - avg(a.stocks))
  })()

  return (
    <DashboardShell>
      <PageHeader
        title="Heatmap"
        description={lastUpdated
          ? `How every Nifty 50 stock moved in the last session. Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`
          : "How every Nifty 50 stock moved in the last session."}
        actions={
          <>
            <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Arrange tiles">
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  aria-pressed={sortBy === s.id}
                  className={cn("rounded px-3 py-1.5 text-sm", sortBy === s.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} /> Refresh
            </button>
          </>
        }
      />

      {loading ? (
        <Panel aria-busy="true">
          <MarketLoader label="the Nifty 50 heatmap" />
        </Panel>
      ) : error ? (
        <Panel>
          <EmptyState
            title="Market data didn't load"
            action={<button onClick={() => fetchData()} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Try again</button>}
          >
            {error}
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-4">
          <div className="panel flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5 text-sm">
            <span><span className="font-semibold tabular text-up">{gainers}</span> <span className="text-muted-foreground">advancing</span></span>
            <span><span className="font-semibold tabular text-down">{losers}</span> <span className="text-muted-foreground">declining</span></span>
            <span>
              <span className="text-muted-foreground">Average move </span>
              <span className={cn("font-semibold tabular", marketAvg >= 0 ? "text-up" : "text-down")}>{marketAvg >= 0 ? "+" : ""}{marketAvg.toFixed(2)}%</span>
            </span>
            <div className="ml-auto"><Legend /></div>
          </div>

          <div className={cn("grid gap-4", sortBy === "sector" && "lg:grid-cols-2")}>
            {groups.map(({ sector, stocks: list }) => {
              const a = avg(list)
              return (
                <Panel key={sector} aria-label={sector}>
                  <PanelHeader
                    title={<>{sector} <span className="ml-1 font-normal text-faint-foreground">{list.length}</span></>}
                    actions={sortBy === "sector" ? <span className={cn("tabular", a >= 0 ? "text-up" : "text-down")}>{a >= 0 ? "+" : ""}{a.toFixed(2)}% avg</span> : undefined}
                  />
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1.5 p-3">
                    {list.map(stock => <Tile key={stock.symbol} stock={stock} />)}
                  </div>
                </Panel>
              )
            })}
          </div>

          <p className="text-xs text-faint-foreground">Prices from Yahoo Finance; they may be delayed up to 15 minutes. Select a tile to open the stock.</p>
        </div>
      )}
    </DashboardShell>
  )
}
