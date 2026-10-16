"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { RefreshCw, Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, EmptyState } from "@/components/ui/panel"

import { API_BASE } from "@/lib/api"
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

const API_URL = API_BASE

const SECTORS = [
  "All", "Banking", "IT", "Energy", "FMCG", "Automobile", "Pharma",
  "Finance", "Infrastructure", "Metals", "Power", "Telecom",
  "Consumer Goods", "Cement", "Healthcare", "Insurance", "Mining", "Conglomerate",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-semibold",
      signal === "BUY"  && "bg-up/15 text-up",
      signal === "SELL" && "bg-down/15 text-down",
      signal === "HOLD" && "bg-primary/15 text-primary",
    )}>
      {signal}
    </span>
  )
}

function ScoreBar({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color = score >= 60 ? "bg-up" : score >= 40 ? "bg-primary" : "bg-down"
  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded-full bg-surface-2 overflow-hidden", size === "sm" ? "h-1.5 w-14" : "h-2 w-20")}>
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("font-semibold tabular-nums", size === "sm" ? "text-xs" : "text-sm",
        score >= 60 ? "text-up" : score >= 40 ? "text-primary" : "text-down"
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
        rsi < 30 ? "text-up" : rsi > 70 ? "text-down" : "text-foreground"
      )}>
        {rsi.toFixed(1)}
      </span>
      {label && (
        <span className={cn(
          "text-[10px] font-bold rounded px-1",
          rsi < 30 ? "bg-up/15 text-up" : "bg-down/15 text-down"
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
    <span className={cn("text-sm font-medium tabular-nums", pos ? "text-up" : "text-down")}>
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  )
}

function FilterSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const active = value !== "All"
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "h-9 appearance-none rounded-md border bg-surface pl-3 pr-8 text-sm transition-colors focus:border-primary/60 focus:outline-none",
          active ? "border-primary/50 text-foreground" : "border-line text-muted-foreground hover:border-line-strong"
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.value === "All" ? `${label}: any` : `${label}: ${o.label}`}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-faint-foreground" />
    </label>
  )
}

const opts = (...values: [string, string?][]) => values.map(([value, label]) => ({ value, label: label ?? value }))

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-muted-foreground/40" />
  return sortDir === "desc"
    ? <ChevronDown size={12} className="text-primary" />
    : <ChevronUp size={12} className="text-primary" />
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
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
      scope="col"
      aria-sort={sortKey === col ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
      className={cn("whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium text-muted-foreground", className)}
    >
      <button onClick={() => handleSort(col)} className="ml-auto flex items-center gap-1 hover:text-foreground">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  )

  const updated = timestamp
    ? cached
      ? `Indicators computed ${Math.max(1, Math.round(cacheAge / 60))} min ago.`
      : `Indicators computed at ${new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`
    : "Fifteen technical indicators, recomputed every 5 minutes."

  return (
    <DashboardShell>
      <PageHeader
        title="Screener"
        description={<>Filter all Nifty 50 stocks by technical signal. {updated}</>}
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
          </button>
        }
      />

      {loading ? (
        <Panel aria-busy="true">
          <div className="px-5 py-4 text-sm text-muted-foreground">Computing indicators for 50 stocks. The first load takes about 10 seconds.</div>
          <div className="space-y-2 px-5 pb-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-surface-2" />)}</div>
        </Panel>
      ) : error ? (
        <Panel>
          <EmptyState title="Screener data didn't load" action={<button onClick={fetchData} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Try again</button>}>
            {error}
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint-foreground" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Symbol or name"
                aria-label="Filter by symbol or name"
                className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-sm text-foreground placeholder:text-faint-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>
            <FilterSelect label="Signal" value={signal} onChange={setSignal} options={opts(["All"], ["BUY", "Buy"], ["HOLD", "Hold"], ["SELL", "Sell"])} />
            <FilterSelect label="Sector" value={sector} onChange={setSector} options={SECTORS.map(v => ({ value: v, label: v }))} />
            <FilterSelect label="RSI" value={rsiZone} onChange={setRsiZone} options={opts(["All"], ["Oversold", "oversold (<30)"], ["Neutral", "30–70"], ["Overbought", "overbought (>70)"])} />
            <FilterSelect label="MACD" value={macdFilter} onChange={setMacdFilter} options={opts(["All"], ["Bullish", "bullish"], ["Bearish", "bearish"])} />
            <FilterSelect label="ADX" value={adxFilter} onChange={setAdxFilter} options={opts(["All"], ["Strong", "trending (>25)"], ["Weak", "no trend (≤25)"])} />
            <FilterSelect label="Trend" value={trendFilter} onChange={setTrendFilter} options={opts(["All"], ["Above SMA50", "above SMA 50"], ["Below SMA50", "below SMA 50"], ["Above SMA200", "above SMA 200"], ["Below SMA200", "below SMA 200"])} />
            {anyFilterActive && (
              <button onClick={clearFilters} className="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="tabular text-foreground">{filtered.length}</span> of {stocks.length} stocks
            <span className="ml-4 tabular text-up">{buys} buy</span>
            <span className="ml-3 tabular text-primary">{holds} hold</span>
            <span className="ml-3 tabular text-down">{sells} sell</span>
          </p>

          {filtered.length === 0 ? (
            <Panel>
              <EmptyState title="No stocks match these filters" action={<button onClick={clearFilters} className="text-sm font-medium text-primary hover:underline">Clear all filters</button>} />
            </Panel>
          ) : (
            <>
              {/* Desktop table */}
              <Panel className="hidden md:block">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="border-b border-line">
                      <tr>
                        <th scope="col" className="px-3 py-2.5 pl-5 text-left text-xs font-medium text-muted-foreground">Stock</th>
                        <ThCol col="price" label="Price" />
                        <ThCol col="change_pct" label="Change" />
                        <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Signal</th>
                        <ThCol col="overall_score" label="Score" className="text-left [&>button]:ml-0" />
                        <ThCol col="rsi" label="RSI" />
                        <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">MACD</th>
                        <ThCol col="adx" label="ADX" />
                        <ThCol col="vs_sma50" label="vs SMA 50" />
                        <ThCol col="vs_sma200" label="vs SMA 200" className="pr-5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filtered.map(stock => (
                        <tr key={stock.symbol} className="group hover:bg-surface-2/50">
                          <td className="px-3 py-2.5 pl-5">
                            <Link href={`/stock/${encodeURIComponent(stock.symbol)}`} className="block">
                              <span className="block font-medium text-foreground group-hover:text-primary">{stock.symbol}</span>
                              <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{stock.name}</span>
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular text-foreground">
                            ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={cn("whitespace-nowrap px-3 py-2.5 text-right tabular", stock.is_positive ? "text-up" : "text-down")}>
                            {stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2.5"><SignalBadge signal={stock.signal} /></td>
                          <td className="px-3 py-2.5"><ScoreBar score={stock.overall_score} size="sm" /></td>
                          <td className="px-3 py-2.5 text-right"><RsiPill rsi={stock.rsi} /></td>
                          <td className={cn("px-3 py-2.5 text-right", stock.macd_bullish ? "text-up" : "text-down")}>{stock.macd_bullish ? "Bullish" : "Bearish"}</td>
                          <td className={cn("px-3 py-2.5 text-right tabular", stock.adx != null && stock.adx > 25 ? "text-foreground" : "text-muted-foreground")}>
                            {stock.adx != null ? stock.adx.toFixed(1) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right"><SmaCell pct={stock.vs_sma50} /></td>
                          <td className="px-3 py-2.5 pr-5 text-right"><SmaCell pct={stock.vs_sma200} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Mobile list */}
              <Panel className="md:hidden">
                <ul className="divide-y divide-line">
                  {filtered.map(stock => (
                    <li key={stock.symbol}>
                      <Link href={`/stock/${encodeURIComponent(stock.symbol)}`} className="block px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{stock.symbol}</span>
                              <SignalBadge signal={stock.signal} />
                            </div>
                            <span className="block truncate text-xs text-muted-foreground">{stock.name}</span>
                          </div>
                          <div className="shrink-0 text-right tabular">
                            <div className="text-sm text-foreground">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className={cn("text-xs", stock.is_positive ? "text-up" : "text-down")}>{stock.is_positive ? "+" : ""}{stock.change_pct.toFixed(2)}%</div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>Score <span className="tabular text-foreground">{stock.overall_score}</span></span>
                          <span>RSI <span className="tabular text-foreground">{stock.rsi?.toFixed(1) ?? "—"}</span></span>
                          <span>ADX <span className="tabular text-foreground">{stock.adx?.toFixed(1) ?? "—"}</span></span>
                          <span className={stock.macd_bullish ? "text-up" : "text-down"}>MACD {stock.macd_bullish ? "bullish" : "bearish"}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          )}
        </div>
      )}
    </DashboardShell>
  )
}
