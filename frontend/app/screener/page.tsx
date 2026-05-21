"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw, Search, TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal,
  Zap, Clock, AlertCircle, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenerStock {
  symbol: string
  name: string
  sector: string
  price: number
  change_pct: number
  is_positive: boolean
  signal: "BUY" | "SELL" | "HOLD"
  overall_score: number
  scores: { trend: number; momentum: number; oscillators: number; volume: number; patterns: number }
  counts: { buy: number; sell: number; neutral: number }
  rsi: number | null
  macd_bullish: boolean
  adx: number | null
  vs_sma50: number | null
  vs_sma200: number | null
  candle: string | null
  candle_type: string | null
}

type SortKey = "overall_score" | "change_pct" | "price" | "rsi" | "adx" | "vs_sma50" | "vs_sma200"
type SortDir = "asc" | "desc"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const SECTORS = [
  "All", "Banking", "IT", "Energy", "FMCG", "Automobile", "Pharma",
  "Finance", "Infrastructure", "Metals", "Power", "Telecom",
  "Consumer Goods", "Cement", "Healthcare", "Insurance", "Mining", "Conglomerate",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide",
      signal === "BUY"  && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
      signal === "SELL" && "bg-red-500/15 text-red-400 border border-red-500/25",
      signal === "HOLD" && "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    )}>
      {signal}
    </span>
  )
}

function ScoreBar({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color = score >= 60 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded-full bg-white/10 overflow-hidden", size === "sm" ? "h-1.5 w-16" : "h-2 w-20")}>
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("font-semibold tabular-nums", size === "sm" ? "text-xs" : "text-sm",
        score >= 60 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"
      )}>
        {score}
      </span>
    </div>
  )
}

function RsiPill({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <span className="text-muted-foreground text-xs">—</span>
  const label = rsi < 30 ? "OS" : rsi > 70 ? "OB" : null
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        rsi < 30 ? "text-emerald-400" : rsi > 70 ? "text-red-400" : "text-foreground"
      )}>
        {rsi.toFixed(1)}
      </span>
      {label && (
        <span className={cn(
          "text-[10px] font-bold rounded px-1",
          rsi < 30 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        )}>
          {label}
        </span>
      )}
    </div>
  )
}

function SmaCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted-foreground text-xs">—</span>
  const pos = pct >= 0
  return (
    <span className={cn("text-sm font-medium tabular-nums", pos ? "text-emerald-400" : "text-red-400")}>
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/5"
      )}
    >
      {label}
    </button>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-muted-foreground/40" />
  return sortDir === "desc"
    ? <ChevronDown size={12} className="text-primary" />
    : <ChevronUp size={12} className="text-primary" />
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const router = useRouter()
  const [stocks, setStocks]         = useState<ScreenerStock[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [timestamp, setTimestamp]   = useState<string | null>(null)
  const [cached, setCached]         = useState(false)
  const [cacheAge, setCacheAge]     = useState(0)

  // Filters
  const [search, setSearch]         = useState("")
  const [signal, setSignal]         = useState<string>("All")
  const [sector, setSector]         = useState<string>("All")
  const [rsiZone, setRsiZone]       = useState<string>("All")
  const [macdFilter, setMacdFilter] = useState<string>("All")
  const [adxFilter, setAdxFilter]   = useState<string>("All")
  const [trendFilter, setTrendFilter] = useState<string>("All")

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("overall_score")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/market/screener`, { cache: "no-store" })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setStocks(json.stocks ?? [])
      setTimestamp(json.timestamp)
      setCached(json.cached ?? false)
      setCacheAge(json.cache_age_s ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch screener data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = "Screener — SparkleAI"
    fetchData()
  }, [fetchData])

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...stocks]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }
    if (signal !== "All") list = list.filter(s => s.signal === signal)
    if (sector !== "All") list = list.filter(s => s.sector === sector)

    if (rsiZone === "Oversold")   list = list.filter(s => s.rsi != null && s.rsi < 30)
    if (rsiZone === "Neutral")    list = list.filter(s => s.rsi != null && s.rsi >= 30 && s.rsi <= 70)
    if (rsiZone === "Overbought") list = list.filter(s => s.rsi != null && s.rsi > 70)

    if (macdFilter === "Bullish") list = list.filter(s => s.macd_bullish)
    if (macdFilter === "Bearish") list = list.filter(s => !s.macd_bullish)

    if (adxFilter === "Strong") list = list.filter(s => s.adx != null && s.adx > 25)
    if (adxFilter === "Weak")   list = list.filter(s => s.adx != null && s.adx <= 25)

    if (trendFilter === "Above SMA50")  list = list.filter(s => s.vs_sma50 != null && s.vs_sma50 > 0)
    if (trendFilter === "Below SMA50")  list = list.filter(s => s.vs_sma50 != null && s.vs_sma50 < 0)
    if (trendFilter === "Above SMA200") list = list.filter(s => s.vs_sma200 != null && s.vs_sma200 > 0)
    if (trendFilter === "Below SMA200") list = list.filter(s => s.vs_sma200 != null && s.vs_sma200 < 0)

    list.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })

    return list
  }, [stocks, search, signal, sector, rsiZone, macdFilter, adxFilter, trendFilter, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortKey(key); setSortDir("desc") }
  }

  // ── Summary counts ──────────────────────────────────────────────────────────
  const buys  = filtered.filter(s => s.signal === "BUY").length
  const sells = filtered.filter(s => s.signal === "SELL").length
  const holds = filtered.filter(s => s.signal === "HOLD").length

  const anyFilterActive = signal !== "All" || sector !== "All" || rsiZone !== "All" ||
    macdFilter !== "All" || adxFilter !== "All" || trendFilter !== "All" || search !== ""

  const clearFilters = () => {
    setSearch(""); setSignal("All"); setSector("All"); setRsiZone("All")
    setMacdFilter("All"); setAdxFilter("All"); setTrendFilter("All")
  }

  const ThCol = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={cn("cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors", className)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  )

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <SlidersHorizontal size={22} className="text-primary" />
              Stock Screener
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live technical analysis across all Nifty 50 stocks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {timestamp && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {cached ? <Clock size={12} /> : <Zap size={12} className="text-primary" />}
                {cached
                  ? `Cached · ${Math.floor(cacheAge / 60)}m ${cacheAge % 60}s ago`
                  : `Live · ${new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                }
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Loading state ── */}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw size={20} className="animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Computing live indicators for 48 stocks…</span>
            </div>
            <p className="text-xs text-muted-foreground">First load takes ~10 seconds · Results cached for 5 minutes</p>
            <div className="h-1.5 w-64 mx-auto rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load screener data</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs text-primary hover:underline">Try again</button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Filters ── */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              {/* Search + clear */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search symbol or name…"
                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                {anyFilterActive && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/20 transition-all"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Filter rows */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Signal</span>
                  {["All", "BUY", "HOLD", "SELL"].map(v => (
                    <FilterChip key={v} label={v} active={signal === v} onClick={() => setSignal(v)} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">RSI</span>
                  {["All", "Oversold", "Neutral", "Overbought"].map(v => (
                    <FilterChip key={v} label={v} active={rsiZone === v} onClick={() => setRsiZone(v)} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">MACD</span>
                  {["All", "Bullish", "Bearish"].map(v => (
                    <FilterChip key={v} label={v} active={macdFilter === v} onClick={() => setMacdFilter(v)} />
                  ))}
                  <span className="text-xs font-medium text-muted-foreground ml-4 shrink-0">ADX</span>
                  {["All", "Strong (>25)", "Weak (≤25)"].map(v => (
                    <FilterChip key={v} label={v} active={adxFilter === v}
                      onClick={() => setAdxFilter(v === "Strong (>25)" ? "Strong" : v === "Weak (≤25)" ? "Weak" : "All")} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Trend</span>
                  {["All", "Above SMA50", "Below SMA50", "Above SMA200", "Below SMA200"].map(v => (
                    <FilterChip key={v} label={v} active={trendFilter === v} onClick={() => setTrendFilter(v)} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Sector</span>
                  <div className="flex flex-wrap gap-2">
                    {SECTORS.map(v => (
                      <FilterChip key={v} label={v} active={sector === v} onClick={() => setSector(v)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Summary bar ── */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {stocks.length} stocks
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-400">{buys} BUY</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-amber-400">{holds} HOLD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-400">{sells} SELL</span>
                </div>
              </div>
            </div>

            {/* ── Table (desktop) ── */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <p className="text-sm font-medium text-foreground">No stocks match your filters</p>
                <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">Clear all filters</button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-white/[0.02]">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8">#</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[160px]">Stock</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                          <ThCol col="price"         label="Price"    />
                          <ThCol col="change_pct"    label="Change"   />
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signal</th>
                          <ThCol col="overall_score" label="Score"    />
                          <ThCol col="rsi"           label="RSI"      />
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">MACD</th>
                          <ThCol col="adx"           label="ADX"      />
                          <ThCol col="vs_sma50"      label="vs SMA50" />
                          <ThCol col="vs_sma200"     label="vs SMA200"/>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((stock, i) => (
                          <tr
                            key={stock.symbol}
                            onClick={() => router.push(`/stock/${stock.symbol}`)}
                            className="cursor-pointer transition-colors hover:bg-white/[0.03] group"
                          >
                            <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{stock.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{stock.sector}</span>
                            </td>
                            <td className="px-3 py-3 font-medium text-foreground tabular-nums whitespace-nowrap">
                              ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn(
                                "flex items-center gap-1 text-sm font-medium tabular-nums whitespace-nowrap",
                                stock.is_positive ? "text-emerald-400" : "text-red-400"
                              )}>
                                {stock.is_positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <SignalBadge signal={stock.signal} />
                            </td>
                            <td className="px-3 py-3">
                              <ScoreBar score={stock.overall_score} size="sm" />
                            </td>
                            <td className="px-3 py-3">
                              <RsiPill rsi={stock.rsi} />
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                                stock.macd_bullish
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              )}>
                                {stock.macd_bullish ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {stock.macd_bullish ? "Bull" : "Bear"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {stock.adx != null
                                ? <span className={cn("text-sm font-medium tabular-nums", stock.adx > 25 ? "text-foreground" : "text-muted-foreground")}>
                                    {stock.adx.toFixed(1)}
                                    {stock.adx > 25 && <span className="ml-1 text-[10px] text-primary">↑</span>}
                                  </span>
                                : <span className="text-muted-foreground text-xs">—</span>
                              }
                            </td>
                            <td className="px-3 py-3"><SmaCell pct={stock.vs_sma50} /></td>
                            <td className="px-3 py-3"><SmaCell pct={stock.vs_sma200} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {filtered.map((stock, i) => (
                    <div
                      key={stock.symbol}
                      onClick={() => router.push(`/stock/${stock.symbol}`)}
                      className="rounded-2xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{stock.symbol}</span>
                              <SignalBadge signal={stock.signal} />
                            </div>
                            <span className="text-xs text-muted-foreground">{stock.name}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={cn("text-xs font-medium", stock.is_positive ? "text-emerald-400" : "text-red-400")}>
                            {stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Score</div>
                          <div className={cn("text-sm font-bold", stock.overall_score >= 60 ? "text-emerald-400" : stock.overall_score >= 40 ? "text-amber-400" : "text-red-400")}>
                            {stock.overall_score}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">RSI</div>
                          <div className={cn("text-sm font-semibold", stock.rsi != null && stock.rsi < 30 ? "text-emerald-400" : stock.rsi != null && stock.rsi > 70 ? "text-red-400" : "text-foreground")}>
                            {stock.rsi?.toFixed(1) ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">ADX</div>
                          <div className="text-sm font-semibold text-foreground">{stock.adx?.toFixed(1) ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">MACD</div>
                          <div className={cn("text-sm font-semibold", stock.macd_bullish ? "text-emerald-400" : "text-red-400")}>
                            {stock.macd_bullish ? "Bull" : "Bear"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{stock.sector}</span>
                        <div className="flex items-center gap-3">
                          <span>SMA50: <SmaCell pct={stock.vs_sma50} /></span>
                          <span>SMA200: <SmaCell pct={stock.vs_sma200} /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
