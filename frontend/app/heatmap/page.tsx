"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { LayoutGrid, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── Types ─────────────────────────────────────────────────────────────────────
interface StockTile {
  symbol: string
  name: string
  sector: string
  price: number
  change_pct: number
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function getTileStyle(pct: number): { bg: string; text: string; border: string } {
  if (pct >= 3)   return { bg: "rgba(22,163,74,0.85)",  text: "#ffffff", border: "rgba(22,163,74,0.4)" }
  if (pct >= 1.5) return { bg: "rgba(34,197,94,0.70)",  text: "#ffffff", border: "rgba(34,197,94,0.35)" }
  if (pct >= 0.5) return { bg: "rgba(74,222,128,0.55)", text: "#ffffff", border: "rgba(74,222,128,0.30)" }
  if (pct > 0)    return { bg: "rgba(74,222,128,0.28)", text: "#4ade80", border: "rgba(74,222,128,0.20)" }
  if (pct === 0)  return { bg: "rgba(255,255,255,0.04)", text: "#94a3b8", border: "rgba(255,255,255,0.08)" }
  if (pct > -0.5) return { bg: "rgba(248,113,113,0.28)", text: "#f87171", border: "rgba(248,113,113,0.20)" }
  if (pct > -1.5) return { bg: "rgba(239,68,68,0.55)",  text: "#ffffff", border: "rgba(239,68,68,0.30)" }
  if (pct > -3)   return { bg: "rgba(220,38,38,0.70)",  text: "#ffffff", border: "rgba(220,38,38,0.35)" }
  return             { bg: "rgba(185,28,28,0.85)",  text: "#ffffff", border: "rgba(185,28,28,0.4)" }
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const stops = [
    { label: "≤ −3%", bg: "rgba(185,28,28,0.85)" },
    { label: "−1.5%",  bg: "rgba(220,38,38,0.70)" },
    { label: "−0.5%",  bg: "rgba(239,68,68,0.55)" },
    { label: "0%",     bg: "rgba(255,255,255,0.06)" },
    { label: "+0.5%",  bg: "rgba(74,222,128,0.28)" },
    { label: "+1.5%",  bg: "rgba(34,197,94,0.70)" },
    { label: "≥ +3%",  bg: "rgba(22,163,74,0.85)" },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:block">Change:</span>
      <div className="flex items-center gap-0.5">
        {stops.map(s => (
          <div key={s.label} className="group relative">
            <div className="h-5 w-7 rounded-sm" style={{ backgroundColor: s.bg }} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20">
              <div className="rounded-md bg-black/90 border border-white/10 px-2 py-1 text-[10px] text-white whitespace-nowrap">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stock Tile ─────────────────────────────────────────────────────────────────
function Tile({ stock }: { stock: StockTile }) {
  const [hovered, setHovered] = useState(false)
  const style = getTileStyle(stock.change_pct)
  const sign = stock.change_pct > 0 ? "+" : ""

  return (
    <Link
      href={`/stock/${stock.symbol}`}
      className="relative block rounded-xl transition-all duration-150 hover:scale-[1.06] hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        minWidth: "72px",
        width: "72px",
        height: "60px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1">
        <span
          className="text-[11px] font-bold leading-none tracking-tight text-center truncate w-full text-center"
          style={{ color: style.text }}
        >
          {stock.symbol.length > 8 ? stock.symbol.slice(0, 7) + "…" : stock.symbol}
        </span>
        <span
          className="text-[11px] font-semibold leading-none tabular-nums"
          style={{ color: style.text, opacity: 0.92 }}
        >
          {sign}{stock.change_pct.toFixed(2)}%
        </span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
          <div className="rounded-xl bg-black/95 border border-white/10 shadow-2xl px-3 py-2.5 min-w-[160px] text-left">
            <p className="text-xs font-bold text-foreground mb-0.5">{stock.symbol}</p>
            <p className="text-[11px] text-muted-foreground mb-2 leading-tight">{stock.name}</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="text-xs font-semibold text-foreground">
                ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-0.5">
              <span className="text-xs text-muted-foreground">Change</span>
              <span
                className="text-xs font-bold"
                style={{ color: stock.change_pct >= 0 ? "#4ade80" : "#f87171" }}
              >
                {sign}{stock.change_pct.toFixed(2)}%
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div className="mx-auto w-2 h-2 -mt-1 rotate-45 bg-black/95 border-r border-b border-white/10" />
        </div>
      )}
    </Link>
  )
}

// ── Sector Block ───────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  Banking: "#60a5fa", IT: "#a78bfa", FMCG: "#fb923c", Energy: "#facc15",
  Automobile: "#34d399", Pharma: "#f472b6", Finance: "#38bdf8",
  Infrastructure: "#a3e635", Metals: "#94a3b8", Cement: "#e2e8f0",
  Power: "#fbbf24", Telecom: "#c084fc", Insurance: "#67e8f9",
  "Consumer Goods": "#fdba74", Healthcare: "#86efac", Conglomerate: "#f9a8d4",
  Mining: "#d4d4d8", Other: "#9ca3af",
}

function SectorBlock({ sector, stocks }: { sector: string; stocks: StockTile[] }) {
  const color = SECTOR_COLORS[sector] || SECTOR_COLORS.Other
  const avgChange = stocks.reduce((s, st) => s + st.change_pct, 0) / stocks.length
  const sign = avgChange > 0 ? "+" : ""

  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      {/* Sector header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-foreground">{sector}</span>
          <span className="text-xs text-muted-foreground">({stocks.length})</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
          avgChange > 0 ? "bg-primary/10 text-primary" : avgChange < 0 ? "bg-destructive/10 text-destructive" : "bg-white/5 text-muted-foreground"
        )}>
          {avgChange > 0 ? <TrendingUp size={11} /> : avgChange < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
          {sign}{avgChange.toFixed(2)}% avg
        </div>
      </div>
      {/* Tiles */}
      <div className="flex flex-wrap gap-2 p-4">
        {stocks.map(stock => <Tile key={stock.symbol} stock={stock} />)}
      </div>
    </div>
  )
}

// ── Summary bar ────────────────────────────────────────────────────────────────
function SummaryBar({ stocks }: { stocks: StockTile[] }) {
  const gainers = stocks.filter(s => s.change_pct > 0).length
  const losers  = stocks.filter(s => s.change_pct < 0).length
  const flat    = stocks.length - gainers - losers
  const avgChange = stocks.reduce((s, st) => s + st.change_pct, 0) / (stocks.length || 1)
  const sign = avgChange > 0 ? "+" : ""

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="text-muted-foreground">Gainers</span>
        <span className="font-bold text-primary">{gainers}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
        <span className="text-muted-foreground">Losers</span>
        <span className="font-bold text-destructive">{losers}</span>
      </div>
      {flat > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Flat</span>
          <span className="font-bold text-muted-foreground">{flat}</span>
        </div>
      )}
      <div className="hidden sm:flex items-center gap-2 ml-auto">
        <span className="text-muted-foreground">Nifty 50 avg</span>
        <span className={cn("font-bold tabular-nums", avgChange >= 0 ? "text-primary" : "text-destructive")}>
          {sign}{avgChange.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HeatmapPage() {
  const [stocks, setStocks]         = useState<StockTile[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sortBy, setSortBy]         = useState<"sector" | "gainers" | "losers">("sector")

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API}/market/heatmap`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStocks(data.stocks || [])
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e.message || "Failed to load market data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Group and sort sectors
  const sectors = (() => {
    const grouped: Record<string, StockTile[]> = {}
    stocks.forEach(s => {
      if (!grouped[s.sector]) grouped[s.sector] = []
      grouped[s.sector].push(s)
    })

    let sortedStocks = [...stocks]
    if (sortBy === "gainers") sortedStocks.sort((a, b) => b.change_pct - a.change_pct)
    if (sortBy === "losers")  sortedStocks.sort((a, b) => a.change_pct - b.change_pct)

    if (sortBy !== "sector") {
      // Flat list mode — return a single pseudo-sector
      return [{ sector: sortBy === "gainers" ? "Top Gainers → Losers" : "Biggest Losers → Gainers", stocks: sortedStocks }]
    }

    // Sort sectors by their average change (best first)
    return Object.entries(grouped)
      .map(([sector, sts]) => ({
        sector,
        stocks: sts.sort((a, b) => b.change_pct - a.change_pct),
      }))
      .sort((a, b) => {
        const avgA = a.stocks.reduce((s, st) => s + st.change_pct, 0) / a.stocks.length
        const avgB = b.stocks.reduce((s, st) => s + st.change_pct, 0) / b.stocks.length
        return avgB - avgA
      })
  })()

  return (
    <DashboardShell noTopBar>
      <div className="max-w-[1400px] mx-auto w-full space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <LayoutGrid size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gradient">Sector Heatmap</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loading ? "Fetching live data…" : lastUpdated
                  ? `Live · Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Nifty 50 · Daily % change · Yahoo Finance"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort controls */}
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {(["sector", "gainers", "losers"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    sortBy === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "sector" ? "By Sector" : s === "gainers" ? "Gainers" : "Losers"}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
              {refreshing ? "Updating…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
            <Loader2 size={36} className="animate-spin text-primary/50" />
            <div className="text-center">
              <p className="text-sm font-medium">Fetching live market data…</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Downloading all 50 Nifty 50 stocks from Yahoo Finance</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-1">Failed to load market data</h3>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {/* ── Data ── */}
        {!loading && !error && stocks.length > 0 && (
          <>
            {/* Summary + Legend */}
            <div className="glass-card rounded-2xl border border-white/5 px-5 py-4 space-y-3">
              <SummaryBar stocks={stocks} />
              <div className="border-t border-white/5 pt-3">
                <Legend />
              </div>
            </div>

            {/* Sector blocks */}
            <div className="space-y-4">
              {sectors.map(({ sector, stocks: sectorStocks }) => (
                <SectorBlock key={sector} sector={sector} stocks={sectorStocks} />
              ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-muted-foreground/50 pb-4">
              Data sourced from Yahoo Finance via our backend · Prices may be delayed by up to 15 min · Click any tile to view full analysis
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
