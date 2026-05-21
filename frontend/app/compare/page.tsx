"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { nifty50Stocks } from "@/lib/stocks"
import { cn } from "@/lib/utils"
import {
  GitCompare, Plus, X, Search, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Indicators {
  price: number
  RSI: number | null
  MACD: number | null
  MACDSignal: number | null
  ADX: number | null
  SMA50: number | null
  SMA200: number | null
  EMA20: number | null
  candle: { latest: string; type: string; reliability: string } | null
  crossovers: Record<string, { name: string; status: string; daysAgo: number }> | null
}

interface Signal {
  signal: "BUY" | "SELL" | "HOLD"
  overall_score: number
  scores: { trend: number; momentum: number; oscillators: number; volume: number; patterns: number }
  counts: { buy: number; sell: number; neutral: number }
}

interface PriceData {
  price: number
  prev_close: number
  change: number
  change_pct: number
}

interface StockData {
  symbol: string
  name: string
  sector: string
  indicators: Indicators | null
  signal: Signal | null
  priceData: PriceData | null
  loading: boolean
  error: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function winnerIndex(values: (number | null)[], higherIsBetter = true): number | null {
  const valid = values.map((v, i) => ({ v, i })).filter(x => x.v != null)
  if (valid.length < 2) return null
  return (higherIsBetter
    ? valid.sort((a, b) => b.v! - a.v!)
    : valid.sort((a, b) => a.v! - b.v!))[0].i
}

function signalColor(s: string) {
  if (s === "BUY")  return "text-primary bg-primary/10 border-primary/20"
  if (s === "SELL") return "text-destructive bg-destructive/10 border-destructive/20"
  return "text-amber-400 bg-amber-400/10 border-amber-400/20"
}

function rsiColor(v: number | null) {
  if (v == null) return "text-muted-foreground"
  if (v < 30) return "text-primary"
  if (v > 70) return "text-destructive"
  return "text-foreground"
}

function rsiLabel(v: number | null) {
  if (v == null) return "—"
  if (v < 30) return "Oversold"
  if (v > 70) return "Overbought"
  return "Neutral"
}

function adxLabel(v: number | null) {
  if (v == null) return "—"
  if (v < 20) return "Weak"
  if (v < 40) return "Moderate"
  return "Strong"
}

function scoreColor(s: number) {
  if (s >= 65) return "#34d399"
  if (s >= 45) return "#fbbf24"
  return "#f87171"
}

function fmt(v: number | null, decimals = 2) {
  return v != null ? v.toFixed(decimals) : "—"
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score, isWinner }: { score: number; isWinner: boolean }) {
  const color = scoreColor(score)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold tabular-nums", isWinner && "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]")} style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Mini score bar (for sub-scores) ──────────────────────────────────────────
function MiniBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor(score) }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{score}</span>
    </div>
  )
}

// ── Stock Selector ─────────────────────────────────────────────────────────────
function StockSelector({
  selected,
  onAdd,
  onRemove,
}: {
  selected: string[]
  onAdd: (sym: string) => void
  onRemove: (sym: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const available = nifty50Stocks.filter(
    s => !selected.includes(s.symbol) &&
    (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
     s.name.toLowerCase().includes(query.toLowerCase()) ||
     s.sector.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selected chips */}
      {selected.map(sym => {
        const meta = nifty50Stocks.find(s => s.symbol === sym)
        return (
          <div
            key={sym}
            className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-[10px] font-bold text-primary">
              {sym.slice(0, 2)}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">{sym}</span>
              {meta && <span className="ml-1.5 text-xs text-muted-foreground hidden sm:inline">{meta.sector}</span>}
            </div>
            <button
              onClick={() => onRemove(sym)}
              className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )
      })}

      {/* Add button */}
      {selected.length < 3 && (
        <div className="relative" ref={ref}>
          <button
            onClick={() => { setOpen(!open); setQuery("") }}
            className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Plus size={14} />
            Add stock {selected.length > 0 && `(${3 - selected.length} left)`}
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 glass-card shadow-2xl overflow-hidden">
              <div className="border-b border-white/5 p-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search stocks…"
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto custom-scrollbar">
                {available.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No results</div>
                ) : available.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => { onAdd(s.symbol); setOpen(false); setQuery("") }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/[0.03] last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/15 text-[10px] font-bold text-primary">
                      {s.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground bg-white/5 rounded-full px-2 py-0.5">{s.sector}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selected.length === 0 && (
        <span className="text-xs text-muted-foreground">Select up to 3 stocks to compare</span>
      )}
    </div>
  )
}

// ── Metric row ────────────────────────────────────────────────────────────────
function MetricRow({
  label,
  hint,
  values,
  winIdx,
  renderCell,
}: {
  label: string
  hint?: string
  values: StockData[]
  winIdx: number | null
  renderCell: (d: StockData, i: number, isWinner: boolean) => React.ReactNode
}) {
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: `180px repeat(${values.length}, 1fr)` }}>
      <div className="flex flex-col justify-center py-4 px-4">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</span>}
      </div>
      {values.map((d, i) => (
        <div
          key={d.symbol}
          className={cn(
            "flex flex-col justify-center py-4 px-4 transition-colors",
            winIdx === i && "bg-primary/[0.04]"
          )}
        >
          {renderCell(d, i, winIdx === i)}
        </div>
      ))}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, colCount }: { title: string; colCount: number }) {
  return (
    <div
      className="grid gap-px border-t border-white/5 bg-white/[0.02]"
      style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
    >
      <div className="py-2.5 px-4 col-span-full">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
    </div>
  )
}

// ── Compare content (needs Suspense for useSearchParams) ──────────────────────
function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [stocks, setStocks] = useState<StockData[]>(() => {
    const syms = searchParams.getAll("s").slice(0, 3)
    return syms.map(sym => {
      const meta = nifty50Stocks.find(s => s.symbol === sym)
      return { symbol: sym, name: meta?.name ?? sym, sector: meta?.sector ?? "", indicators: null, signal: null, priceData: null, loading: true, error: null }
    })
  })

  const fetchStock = useCallback(async (symbol: string) => {
    setStocks(prev => prev.map(s => s.symbol === symbol ? { ...s, loading: true, error: null } : s))
    try {
      const [fullRes, priceRes] = await Promise.all([
        fetch(`${API}/full/${symbol}.NS`),
        fetch(`${API}/price/${symbol}.NS`),
      ])
      const [fullJson, priceJson] = await Promise.all([fullRes.json(), priceRes.json()])
      setStocks(prev => prev.map(s => s.symbol !== symbol ? s : {
        ...s,
        indicators: fullJson.indicators ?? null,
        signal: fullJson.signal ?? null,
        priceData: priceJson.error ? null : priceJson,
        loading: false,
        error: null,
      }))
    } catch (e: any) {
      setStocks(prev => prev.map(s => s.symbol === symbol ? { ...s, loading: false, error: "Failed to load" } : s))
    }
  }, [])

  // Fetch whenever symbols change
  useEffect(() => {
    stocks.forEach(s => { if (s.loading && s.indicators === null) fetchStock(s.symbol) })
  }, [stocks.map(s => s.symbol).join(",")])

  const addStock = useCallback((symbol: string) => {
    if (stocks.find(s => s.symbol === symbol) || stocks.length >= 3) return
    const meta = nifty50Stocks.find(s => s.symbol === symbol)
    const next = [...stocks, { symbol, name: meta?.name ?? symbol, sector: meta?.sector ?? "", indicators: null, signal: null, priceData: null, loading: true, error: null }]
    setStocks(next)
    const params = new URLSearchParams()
    next.forEach(s => params.append("s", s.symbol))
    router.replace(`/compare?${params}`, { scroll: false })
  }, [stocks, router])

  const removeStock = useCallback((symbol: string) => {
    const next = stocks.filter(s => s.symbol !== symbol)
    setStocks(next)
    const params = new URLSearchParams()
    next.forEach(s => params.append("s", s.symbol))
    router.replace(next.length ? `/compare?${params}` : "/compare", { scroll: false })
  }, [stocks, router])

  const n = stocks.length

  return (
    <div className="max-w-[1300px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <GitCompare size={26} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Compare Stocks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Side-by-side technical analysis · up to 3 stocks</p>
          </div>
        </div>
      </div>

      {/* Stock selector */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <StockSelector
          selected={stocks.map(s => s.symbol)}
          onAdd={addStock}
          onRemove={removeStock}
        />
      </div>

      {/* Empty state */}
      {n === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5">
            <GitCompare size={32} className="text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">No stocks selected</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Use the selector above to add up to 3 Nifty 50 stocks and compare them side by side.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {["RELIANCE", "TCS", "HDFCBANK"].map(sym => (
              <button
                key={sym}
                onClick={() => addStock(sym)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
              >
                <Plus size={11} /> {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {n > 0 && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
          {/* ── Stock header row ── */}
          <div className="grid gap-px bg-white/5" style={{ gridTemplateColumns: `180px repeat(${n}, 1fr)` }}>
            <div className="bg-background/80 p-4 flex items-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</span>
            </div>
            {stocks.map((s, i) => {
              const meta = nifty50Stocks.find(x => x.symbol === s.symbol)
              const pd = s.priceData
              const isUp = pd ? pd.change_pct >= 0 : null
              // Overall winner
              const scores = stocks.map(x => x.signal?.overall_score ?? null)
              const topIdx = winnerIndex(scores)
              const isTopPick = topIdx === i

              return (
                <div key={s.symbol} className={cn("bg-background/80 p-4", isTopPick && "bg-primary/[0.04]")}>
                  {s.loading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-10 w-10 rounded-xl bg-white/10" />
                      <div className="h-4 w-20 rounded bg-white/10" />
                      <div className="h-3 w-32 rounded bg-white/5" />
                    </div>
                  ) : s.error ? (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle size={16} /> {s.error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/stock/${s.symbol}`}>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 text-sm font-bold text-primary hover:scale-105 transition-transform">
                              {s.symbol.slice(0, 2)}
                            </div>
                          </Link>
                          <div>
                            <Link href={`/stock/${s.symbol}`} className="text-base font-bold hover:text-primary transition-colors">
                              {s.symbol}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{s.name}</p>
                          </div>
                        </div>
                        <button onClick={() => removeStock(s.symbol)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1">
                          <X size={14} />
                        </button>
                      </div>
                      {/* Sector + top-pick badge */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex text-[10px] font-medium bg-white/5 border border-white/10 text-muted-foreground rounded-full px-2 py-0.5">
                          {meta?.sector ?? s.sector}
                        </span>
                        {isTopPick && n > 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/15 border border-primary/25 text-primary rounded-full px-2 py-0.5">
                            ★ Top pick
                          </span>
                        )}
                      </div>
                      {/* Live price */}
                      {pd && (
                        <div>
                          <p className="text-xl font-bold tabular-nums">
                            ₹{pd.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </p>
                          <div className={cn("flex items-center gap-1 text-xs font-semibold mt-0.5", isUp ? "text-primary" : "text-destructive")}>
                            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {isUp ? "+" : ""}{pd.change_pct.toFixed(2)}% today
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Section: Signal ── */}
          <SectionHeader title="Technical Signal" colCount={n} />

          <MetricRow
            label="Overall Signal"
            hint="BUY / SELL / HOLD"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-8 w-20 rounded-lg bg-white/5 animate-pulse" />
              if (!d.signal) return <span className="text-xs text-muted-foreground">—</span>
              return (
                <span className={cn("inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold tracking-wide", signalColor(d.signal.signal))}>
                  {d.signal.signal}
                </span>
              )
            }}
          />

          <MetricRow
            label="Overall Score"
            hint="Weighted technical score"
            values={stocks}
            winIdx={winnerIndex(stocks.map(s => s.signal?.overall_score ?? null))}
            renderCell={(d, _, isWinner) => {
              if (d.loading) return <div className="h-10 w-full rounded bg-white/5 animate-pulse" />
              if (!d.signal) return <span className="text-xs text-muted-foreground">—</span>
              return <ScoreBar score={d.signal.overall_score} isWinner={isWinner} />
            }}
          />

          <MetricRow
            label="Buy / Sell signals"
            hint="Out of 11 indicators"
            values={stocks}
            winIdx={winnerIndex(stocks.map(s => s.signal?.counts.buy ?? null))}
            renderCell={(d, _, isWinner) => {
              if (d.loading) return <div className="h-5 w-24 rounded bg-white/5 animate-pulse" />
              if (!d.signal) return <span className="text-xs text-muted-foreground">—</span>
              const { buy, sell, neutral } = d.signal.counts
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary", isWinner && "ring-1 ring-primary/30")}>↑ {buy}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">↓ {sell}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground">— {neutral}</span>
                </div>
              )
            }}
          />

          {/* ── Section: Score breakdown ── */}
          <SectionHeader title="Score Breakdown" colCount={n} />

          {(["trend", "momentum", "oscillators", "volume", "patterns"] as const).map(key => (
            <MetricRow
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              hint={{ trend: "25% weight", momentum: "25% weight", oscillators: "20% weight", volume: "15% weight", patterns: "15% weight" }[key]}
              values={stocks}
              winIdx={winnerIndex(stocks.map(s => s.signal?.scores[key] ?? null))}
              renderCell={(d) => {
                if (d.loading) return <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
                const score = d.signal?.scores[key]
                if (score == null) return <span className="text-xs text-muted-foreground">—</span>
                return <MiniBar score={score} />
              }}
            />
          ))}

          {/* ── Section: Indicators ── */}
          <SectionHeader title="Key Indicators" colCount={n} />

          <MetricRow
            label="RSI (14)"
            hint="< 30 oversold · > 70 overbought"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-16 rounded bg-white/5 animate-pulse" />
              const rsi = d.indicators?.RSI ?? null
              return (
                <div className="space-y-0.5">
                  <span className={cn("text-sm font-bold tabular-nums", rsiColor(rsi))}>{fmt(rsi, 1)}</span>
                  <p className="text-[10px] text-muted-foreground">{rsiLabel(rsi)}</p>
                </div>
              )
            }}
          />

          <MetricRow
            label="MACD"
            hint="Momentum direction"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
              const macd = d.indicators?.MACD ?? null
              const sig  = d.indicators?.MACDSignal ?? null
              if (macd == null || sig == null) return <span className="text-xs text-muted-foreground">—</span>
              const bullish = macd > sig
              return (
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", bullish ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                  {bullish ? "Bullish" : "Bearish"}
                </span>
              )
            }}
          />

          <MetricRow
            label="ADX (14)"
            hint="Trend strength"
            values={stocks}
            winIdx={winnerIndex(stocks.map(s => s.indicators?.ADX ?? null))}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-16 rounded bg-white/5 animate-pulse" />
              const adx = d.indicators?.ADX ?? null
              return (
                <div className="space-y-0.5">
                  <span className="text-sm font-bold tabular-nums">{fmt(adx, 1)}</span>
                  <p className="text-[10px] text-muted-foreground">{adxLabel(adx)}</p>
                </div>
              )
            }}
          />

          <MetricRow
            label="vs SMA 50"
            hint="Price vs 50-day moving avg"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
              const price = d.indicators?.price ?? null
              const sma   = d.indicators?.SMA50 ?? null
              if (price == null || sma == null) return <span className="text-xs text-muted-foreground">—</span>
              const above = price > sma
              const pct   = ((price - sma) / sma * 100)
              return (
                <div className="space-y-0.5">
                  <span className={cn("text-xs font-semibold", above ? "text-primary" : "text-destructive")}>
                    {above ? "Above" : "Below"}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{above ? "+" : ""}{pct.toFixed(1)}%</p>
                </div>
              )
            }}
          />

          <MetricRow
            label="vs SMA 200"
            hint="Price vs 200-day moving avg"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
              const price = d.indicators?.price ?? null
              const sma   = d.indicators?.SMA200 ?? null
              if (price == null || sma == null) return <span className="text-xs text-muted-foreground">—</span>
              const above = price > sma
              const pct   = ((price - sma) / sma * 100)
              return (
                <div className="space-y-0.5">
                  <span className={cn("text-xs font-semibold", above ? "text-primary" : "text-destructive")}>
                    {above ? "Above" : "Below"}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{above ? "+" : ""}{pct.toFixed(1)}%</p>
                </div>
              )
            }}
          />

          {/* ── Section: Patterns ── */}
          <SectionHeader title="Price Action" colCount={n} />

          <MetricRow
            label="Candlestick"
            hint="Latest pattern"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-28 rounded bg-white/5 animate-pulse" />
              const candle = d.indicators?.candle
              if (!candle) return <span className="text-xs text-muted-foreground">—</span>
              return (
                <div className="space-y-0.5">
                  <span className={cn("text-xs font-semibold",
                    candle.type === "bullish" ? "text-primary" :
                    candle.type === "bearish" ? "text-destructive" :
                    "text-muted-foreground"
                  )}>
                    {candle.latest}
                  </span>
                  <p className="text-[10px] text-muted-foreground capitalize">{candle.type} · {candle.reliability} reliability</p>
                </div>
              )
            }}
          />

          <MetricRow
            label="Golden/Death Cross"
            hint="50 & 200 SMA crossover"
            values={stocks}
            winIdx={null}
            renderCell={(d) => {
              if (d.loading) return <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
              const golden = d.indicators?.crossovers?.golden
              if (!golden) return <span className="text-xs text-muted-foreground">—</span>
              const bullish = golden.status === "Bullish"
              return (
                <div className="space-y-0.5">
                  <span className={cn("text-xs font-semibold", bullish ? "text-primary" : "text-destructive")}>
                    {bullish ? "Golden Cross" : "Death Cross"}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{golden.daysAgo}d ago</p>
                </div>
              )
            }}
          />

          {/* Bottom padding row */}
          <div className="h-4" />
        </div>
      )}

      {n > 0 && (
        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          Technical data via Yahoo Finance · May be delayed up to 15 min · Click any stock name to view full analysis
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  return (
    <DashboardShell noTopBar>
      <Suspense fallback={
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-primary/50" />
        </div>
      }>
        <CompareContent />
      </Suspense>
    </DashboardShell>
  )
}
