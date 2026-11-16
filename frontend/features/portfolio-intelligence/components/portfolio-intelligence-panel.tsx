"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  BarChart3,
  Brain,
  GitCompareArrows,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react"
import { API_BASE } from "@/lib/api"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { demoStocks as nifty50Stocks } from "@/lib/demo-prices"
import {
  analyzePortfolio,
  FACTOR_KEYS,
  isMarketAnalytics,
  samplePortfolio,
  rebaseToLivePrices,
  type FactorKey,
  type HoldingInput,
  type MarketAnalytics,
} from "../domain/portfolio-model"

const factorLabels: Record<FactorKey, string> = {
  momentum: "Momentum",
  value: "Value",
  size: "Size",
  quality: "Quality",
  lowVolatility: "Low volatility",
}

const DASH = "—"

function formatRatio(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value) ? DASH : value.toFixed(digits)
}

function formatPctOf(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? DASH : formatPct(value * 100, digits)
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`
}

function formatPct(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function tone(value: number) {
  if (value > 0) return "text-primary"
  if (value < 0) return "text-destructive"
  return "text-foreground"
}

function ScoreBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function PortfolioIntelligencePanel() {
  const [holdings, setHoldings] = useState<HoldingInput[]>(samplePortfolio)
  const [selectedPair, setSelectedPair] = useState(0)
  // Bundled snapshot first, then live quotes for all 50 from the backend.
  const [universe, setUniverse] = useState(nifty50Stocks)
  const holdingsEdited = useRef(false)
  // A year of real daily prices, factor scores and pairs from the backend.
  const [analytics, setAnalytics] = useState<MarketAnalytics | null>(null)
  const [analyticsState, setAnalyticsState] = useState<"loading" | "ready" | "error">("loading")
  const summary = useMemo(() => analyzePortfolio(holdings, universe, analytics), [holdings, universe, analytics])

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/portfolio/analytics`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return
        if (isMarketAnalytics(data)) {
          setAnalytics(data)
          setAnalyticsState("ready")
        } else {
          setAnalyticsState("error")
        }
      })
      .catch(() => { if (active) setAnalyticsState("error") })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/market/heatmap`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const rows: Array<{ symbol: string; price: number; change_pct: number }> = data?.stocks ?? []
        if (!active || !Array.isArray(rows) || rows.length === 0) return
        const live = nifty50Stocks.map((stock) => {
          const row = rows.find((item) => item.symbol === stock.symbol)
          return row && row.price > 0 ? { ...stock, price: row.price, change: Number(row.change_pct) || 0 } : stock
        })
        setUniverse(live)
        if (!holdingsEdited.current) setHoldings(rebaseToLivePrices(samplePortfolio, live))
      })
      .catch(() => {})
    return () => { active = false }
  }, [])
  const pairs = analytics?.pairs ?? []
  const activePair = pairs[selectedPair] ?? pairs[0]
  const pairChart = (activePair?.points ?? []).map((point) => ({ ...point, upper: 2, mean: 0, lower: -2 }))
  const risk = summary.risk
  const factorData = FACTOR_KEYS.flatMap((key) => {
    const value = summary.factorTilt[key]
    return value == null ? [] : [{ key, factor: factorLabels[key], score: Math.round(value) }]
  })
  const historyNote =
    analyticsState === "loading"
      ? "Loading a year of market history…"
      : analyticsState === "error"
        ? "Market history is unavailable right now, so risk and factor figures are blank."
        : analytics
          ? `Based on daily prices from ${formatDate(analytics.start)} to ${formatDate(analytics.as_of)}.`
          : ""
  const sectorData = summary.sectorWeights.map((item) => ({
    sector: item.sector,
    weight: Number((item.weight * 100).toFixed(1)),
  }))
  const themeData = summary.themes.map((item) => ({
    theme: item.theme,
    weight: Number((item.weight * 100).toFixed(1)),
  }))

  const updateHolding = (index: number, patch: Partial<HoldingInput>) => {
    holdingsEdited.current = true
    setHoldings((current) => current.map((holding, itemIndex) => itemIndex === index ? { ...holding, ...patch } : holding))
  }

  const addHolding = () => {
    holdingsEdited.current = true
    const next = universe.find((stock) => !holdings.some((holding) => holding.symbol === stock.symbol)) ?? universe[0]
    setHoldings((current) => [...current, { symbol: next.symbol, quantity: 1, averagePrice: next.price }])
  }

  const removeHolding = (index: number) => {
    holdingsEdited.current = true
    setHoldings((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] min-w-0 space-y-6 overflow-hidden">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Portfolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Model your holdings to see factor tilts, concentration risk and pairs-trading ideas. Edits stay on this device.
          </p>
          <p className="mt-1 text-xs text-faint-foreground">{historyNote}</p>
        </div>
        <div className="panel grid grid-cols-3 divide-x divide-line">
          <Metric label="Value" value={formatCurrency(summary.totalValue)} />
          <Metric label="Profit / loss" value={formatCurrency(summary.pnl)} valueClass={tone(summary.pnl)} />
          <Metric label="1-year alpha" value={formatPctOf(risk?.alpha)} valueClass={tone(risk?.alpha ?? 0)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon={Target}
          label="1 year vs Nifty 50"
          value={formatPctOf(risk?.excessReturn)}
          caption={risk ? `${formatPctOf(risk.annualReturn)} at today's weights vs ${formatPctOf(risk.benchmarkReturn)} for the index` : "Past-year return at today's weights, minus the index"}
        />
        <InsightCard icon={Activity} label="Portfolio beta" value={formatRatio(risk?.beta)} caption="Move per 1% move in the Nifty 50, past year of daily returns" />
        <InsightCard icon={ShieldCheck} label="Effective holdings" value={summary.effectiveStocks.toFixed(1)} caption="Number of equal-sized holdings these weights are equivalent to" />
        <InsightCard
          icon={Sparkles}
          label="Sharpe ratio"
          value={formatRatio(risk?.sharpe)}
          caption={`Past-year return above a ${formatPctOf(analytics?.risk_free ?? 0.065, 1).replace("+", "")} risk-free rate, per unit of volatility`}
        />
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground">Holdings Lab</h2>
              <p className="mt-1 text-sm text-muted-foreground">Edit quantities and cost basis; the intelligence layer updates instantly.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { holdingsEdited.current = false; setHoldings(rebaseToLivePrices(samplePortfolio, universe)) }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <RefreshCw size={15} />
                Sample
              </button>
              <button
                type="button"
                onClick={addHolding}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </div>
          <div className="max-w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">Stock</th>
                  <th className="px-3 py-3 text-left">Qty</th>
                  <th className="px-3 py-3 text-left">Avg price</th>
                  <th className="px-3 py-3 text-left">Value</th>
                  <th className="px-3 py-3 text-left">Weight</th>
                  <th className="px-3 py-3 text-left">P/L</th>
                  <th className="px-3 py-3 text-left" title="Jensen's alpha over the past year against the Nifty 50, annualised">1Y alpha</th>
                  <th className="px-3 py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.holdings.map((holding, index) => (
                  <tr key={`${holding.symbol}-${index}`}>
                    <td className="px-3 py-3">
                      <select
                        value={holding.symbol}
                        onChange={(event) => {
                          const stock = universe.find((item) => item.symbol === event.target.value)
                          updateHolding(index, { symbol: event.target.value, averagePrice: stock?.price ?? holding.averagePrice })
                        }}
                        className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                      >
                        {nifty50Stocks.map((stock) => (
                          <option key={stock.symbol} value={stock.symbol}>{stock.symbol} - {stock.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        inputMode="numeric"
                        value={holding.quantity}
                        onChange={(event) => updateHolding(index, { quantity: Number(event.target.value) || 0 })}
                        className="h-10 w-16 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary sm:w-20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        inputMode="decimal"
                        value={holding.averagePrice}
                        onChange={(event) => updateHolding(index, { averagePrice: Number(event.target.value) || 0 })}
                        className="h-10 w-24 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary sm:w-28"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground">{formatCurrency(holding.value)}</td>
                    <td className="px-3 py-3">{(holding.weight * 100).toFixed(1)}%</td>
                    <td className={`px-3 py-3 font-semibold ${tone(holding.pnl)}`}>{formatPct(holding.pnlPct)}</td>
                    <td className={`px-3 py-3 font-semibold ${tone(holding.analytics?.alpha ?? 0)}`}>
                      {formatPctOf(holding.analytics?.alpha)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeHolding(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${holding.symbol}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">Factor Intelligence</h2>
              <p className="mt-1 text-sm text-muted-foreground">Value-weighted percentile ranks against the other Nifty 50 stocks: 0 is the lowest, 100 the highest.</p>
            </div>
          </div>
          {factorData.length === 0 ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">{historyNote}</p>
          ) : (
          <>
          <ChartContainer
            config={{ score: { label: "Score", color: "#2FB57C" } }}
            className="h-[300px] w-full max-w-full"
          >
            <RadarChart data={factorData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <Radar dataKey="score" stroke="#2FB57C" fill="#2FB57C" fillOpacity={0.22} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {factorData.map((item) => (
              <div key={item.factor} title={analytics?.methodology[item.key]} className="min-w-0 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{item.factor}</span>
                  <span className="text-xs font-bold text-foreground">{item.score}</span>
                </div>
                <ScoreBar value={item.score} />
              </div>
            ))}
          </div>
          </>
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            <h2 className="text-base font-medium text-foreground">Sector Allocation</h2>
          </div>
          <ChartContainer config={{ weight: { label: "Weight", color: "#6AA6F8" } }} className="h-[260px] w-full">
            <BarChart data={sectorData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sector" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="weight" fill="#6AA6F8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-base font-medium text-foreground">Themes</h2>
          </div>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">Share of value by investment theme, with each sector mapped to one theme.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {themeData.slice(0, 8).map((item) => (
              <div key={item.theme} className="min-w-0 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.theme}</p>
                  <span className="text-xs font-bold text-primary">{item.weight.toFixed(1)}%</span>
                </div>
                <ScoreBar value={item.weight} color="bg-info" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">Risk Notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Rule-based observations from your weights, a year of daily prices and company fundamentals.</p>
            </div>
          </div>
          <div className="space-y-3">
            {summary.notes.map((note) => (
              <div key={note} className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                {note}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <RiskStat label="Volatility (1Y)" value={risk ? `${(risk.volatility * 100).toFixed(1)}%` : DASH} hint={risk ? `Nifty 50: ${(risk.benchmarkVolatility * 100).toFixed(1)}%` : undefined} />
            <RiskStat label="Max drawdown (1Y)" value={formatPctOf(risk?.maxDrawdown)} />
            <RiskStat label="Diversification ratio" value={formatRatio(risk?.diversificationRatio)} hint="Above 1 means low correlation is cutting risk" />
            <RiskStat label="Concentration (HHI)" value={`${summary.concentration.toFixed(1)}%`} />
            <RiskStat label="Day move" value={formatPct(summary.dayChangePct)} />
            <RiskStat label="Holdings" value={String(summary.holdings.length)} />
          </div>
        </div>

        <div className="min-w-0 panel p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitCompareArrows size={20} />
              </div>
              <div>
                <h2 className="text-base font-medium text-foreground">Pairs Trading Lab</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Same-sector Engle-Granger cointegration tests on a year of log prices
                  {analytics ? `; ${analytics.pairs_tested} pairs tested, so a few can pass by chance` : ""}. Educational, not a trade recommendation.
                </p>
              </div>
            </div>
            {pairs.length > 0 && (
            <select
              value={selectedPair}
              onChange={(event) => setSelectedPair(Number(event.target.value))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              {pairs.map((pair, index) => (
                <option key={pair.pair} value={index}>{pair.pair}{pair.significance ? ` (${pair.significance})` : ""}</option>
              ))}
            </select>
            )}
          </div>

          {!activePair && (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">{historyNote}</p>
          )}
          {activePair && (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <RiskStat
                  label="ADF statistic"
                  value={activePair.adf_t.toFixed(2)}
                  hint={activePair.significance ? `Cointegrated at ${activePair.significance}` : "Not cointegrated at 10%"}
                />
                <RiskStat label="Half-life" value={activePair.half_life == null ? DASH : `${activePair.half_life} days`} hint="Time for a gap to halve" />
                <RiskStat label="Z-score now" value={activePair.z.toFixed(2)} hint={`Hedge ratio ${activePair.hedge_ratio}`} />
                <RiskStat label="Signal" value={activePair.signal} compact />
              </div>
              <ChartContainer config={{ z: { label: "Spread z-score", color: "#2FB57C" } }} className="h-[270px] w-full">
                <LineChart data={pairChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis domain={[-3.5, 3.5]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="upper" stroke="#F2A93B" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="mean" stroke="#8A95AB" strokeDasharray="3 3" dot={false} />
                  <Line dataKey="lower" stroke="#F2A93B" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="z" stroke="#2FB57C" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </div>
      </section>

      <section className="min-w-0 panel p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          <h2 className="text-base font-medium text-foreground">Contribution Curve</h2>
        </div>
        <ChartContainer config={{ value: { label: "Value", color: "#2FB57C" } }} className="h-[260px] w-full">
          <AreaChart data={summary.topContributors.map((holding) => ({ symbol: holding.symbol, value: Math.round(holding.pnl) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="symbol" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="value" fill="#2FB57C" fillOpacity={0.18} stroke="#2FB57C" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </section>
    </div>
  )
}

function Metric({ label, value, valueClass = "text-foreground" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`figure mt-1 text-lg ${valueClass}`}>{value}</p>
    </div>
  )
}

function InsightCard({ icon: Icon, label, value, caption }: { icon: typeof Target; label: string; value: string; caption: string }) {
  return (
    <div className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={19} />
        </div>
        <span className="text-xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  )
}

function RiskStat({ label, value, hint, compact = false }: { label: string; value: string; hint?: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold text-foreground ${compact ? "text-xs leading-snug" : "text-base"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-faint-foreground">{hint}</p>}
    </div>
  )
}
