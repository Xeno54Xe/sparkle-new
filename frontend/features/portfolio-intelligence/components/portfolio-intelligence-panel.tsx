"use client"

import { useMemo, useState } from "react"
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
  BriefcaseBusiness,
  GitCompareArrows,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { nifty50Stocks } from "@/lib/stocks"
import {
  analyzePortfolio,
  findPairCandidates,
  samplePortfolio,
  type HoldingInput,
} from "../domain/portfolio-model"

const factorLabels = {
  momentum: "Momentum",
  value: "Value",
  size: "Size",
  quality: "Quality",
  lowVolatility: "Low Vol",
  esg: "ESG",
  alpha: "Alpha",
  penetration: "Penetration",
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
    <div className="h-2 overflow-hidden rounded-full bg-white/5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function PortfolioIntelligencePanel() {
  const [holdings, setHoldings] = useState<HoldingInput[]>(samplePortfolio)
  const [selectedPair, setSelectedPair] = useState(0)
  const summary = useMemo(() => analyzePortfolio(holdings), [holdings])
  const pairs = useMemo(() => findPairCandidates(6), [])
  const activePair = pairs[selectedPair] ?? pairs[0]
  const factorData = Object.entries(summary.factorTilt).map(([key, value]) => ({
    factor: factorLabels[key as keyof typeof factorLabels],
    score: Math.round(value),
  }))
  const sectorData = summary.sectorWeights.map((item) => ({
    sector: item.sector,
    weight: Number((item.weight * 100).toFixed(1)),
  }))
  const themeData = summary.themes.map((item) => ({
    theme: item.theme,
    weight: Number((item.weight * 100).toFixed(1)),
  }))

  const updateHolding = (index: number, patch: Partial<HoldingInput>) => {
    setHoldings((current) => current.map((holding, itemIndex) => itemIndex === index ? { ...holding, ...patch } : holding))
  }

  const addHolding = () => {
    const next = nifty50Stocks.find((stock) => !holdings.some((holding) => holding.symbol === stock.symbol)) ?? nifty50Stocks[0]
    setHoldings((current) => [...current, { symbol: next.symbol, quantity: 1, averagePrice: next.price }])
  }

  const removeHolding = (index: number) => {
    setHoldings((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] min-w-0 space-y-6 overflow-hidden">
      <section className="overflow-hidden rounded-xl border border-primary/20 bg-card">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <BriefcaseBusiness size={24} />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Free-data portfolio lab</span>
                  <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-300">Factor + pairs intelligence</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Portfolio Intelligence</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Analyze holdings through momentum, value, size, ESG, alpha, penetration themes, concentration risk and pairs-trading signals.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border bg-background/60 lg:border-l lg:border-t-0">
            <Metric label="Value" value={formatCurrency(summary.totalValue)} />
            <Metric label="P/L" value={formatCurrency(summary.pnl)} valueClass={tone(summary.pnl)} />
            <Metric label="Alpha" value={`${summary.estimatedAlpha >= 0 ? "+" : ""}${summary.estimatedAlpha.toFixed(2)}`} valueClass={tone(summary.estimatedAlpha)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Target} label="Benchmark edge" value={formatPct(summary.pnlPct)} caption="Position P/L versus cost basis" />
        <InsightCard icon={Activity} label="Portfolio beta" value={summary.beta.toFixed(2)} caption="Model sensitivity to market moves" />
        <InsightCard icon={ShieldCheck} label="Effective stocks" value={summary.effectiveStocks.toFixed(1)} caption="Diversification after correlation/concentration" />
        <InsightCard icon={Sparkles} label="Sharpe-like score" value={summary.sharpeLike.toFixed(2)} caption="Free-data risk-adjusted proxy" />
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Holdings Lab</h2>
              <p className="mt-1 text-sm text-muted-foreground">Edit quantities and cost basis; the intelligence layer updates instantly.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHoldings(samplePortfolio)}
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
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">Stock</th>
                  <th className="px-3 py-3 text-left">Qty</th>
                  <th className="px-3 py-3 text-left">Avg price</th>
                  <th className="px-3 py-3 text-left">Value</th>
                  <th className="px-3 py-3 text-left">Weight</th>
                  <th className="px-3 py-3 text-left">P/L</th>
                  <th className="px-3 py-3 text-left">Alpha</th>
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
                          const stock = nifty50Stocks.find((item) => item.symbol === event.target.value)
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
                    <td className="px-3 py-3">
                      <div className="min-w-20 space-y-1">
                        <span className="text-xs font-semibold text-foreground">{Math.round(holding.factors.alpha)}/100</span>
                        <ScoreBar value={holding.factors.alpha} />
                      </div>
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

        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Factor Intelligence</h2>
              <p className="mt-1 text-sm text-muted-foreground">Portfolio tilt across the professor keywords: momentum, value, size, ESG, alpha and penetration.</p>
            </div>
          </div>
          <ChartContainer
            config={{ score: { label: "Score", color: "#34d399" } }}
            className="h-[300px] w-full max-w-full"
          >
            <RadarChart data={factorData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <Radar dataKey="score" stroke="#34d399" fill="#34d399" fillOpacity={0.22} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {factorData.map((item) => (
              <div key={item.factor} className="min-w-0 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{item.factor}</span>
                  <span className="text-xs font-bold text-foreground">{item.score}</span>
                </div>
                <ScoreBar value={item.score} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Sector Allocation</h2>
          </div>
          <ChartContainer config={{ weight: { label: "Weight", color: "#38bdf8" } }} className="h-[260px] w-full">
            <BarChart data={sectorData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sector" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="weight" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Theme Penetration</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {themeData.slice(0, 8).map((item) => (
              <div key={item.theme} className="min-w-0 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.theme}</p>
                  <span className="text-xs font-bold text-primary">{item.weight.toFixed(1)}%</span>
                </div>
                <ScoreBar value={item.weight} color="bg-sky-400" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Risk Notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Explainable rebalancing suggestions from free-data factor estimates.</p>
            </div>
          </div>
          <div className="space-y-3">
            {summary.rebalanceNotes.map((note) => (
              <div key={note} className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                {note}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <RiskStat label="Concentration" value={`${summary.concentrationRisk.toFixed(1)}%`} />
            <RiskStat label="Volatility" value={`${summary.volatility.toFixed(1)}%`} />
            <RiskStat label="Day move" value={formatPct(summary.dayChangePct)} />
            <RiskStat label="Holdings" value={String(summary.holdings.length)} />
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitCompareArrows size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pairs Trading Lab</h2>
                <p className="mt-1 text-sm text-muted-foreground">Free-data mean-reversion candidates from same-sector synthetic spread history.</p>
              </div>
            </div>
            <select
              value={selectedPair}
              onChange={(event) => setSelectedPair(Number(event.target.value))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              {pairs.map((pair, index) => (
                <option key={pair.pair} value={index}>{pair.pair}</option>
              ))}
            </select>
          </div>

          {activePair && (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <RiskStat label="Correlation" value={activePair.correlation.toFixed(2)} />
                <RiskStat label="Z-score" value={activePair.zScore.toFixed(2)} />
                <RiskStat label="Confidence" value={`${Math.round(activePair.confidence)}%`} />
                <RiskStat label="Signal" value={activePair.signal} compact />
              </div>
              <ChartContainer config={{ spread: { label: "Spread", color: "#34d399" } }} className="h-[270px] w-full">
                <LineChart data={activePair.points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={7} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="upper" stroke="#f59e0b" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="mean" stroke="#94a3b8" strokeDasharray="3 3" dot={false} />
                  <Line dataKey="lower" stroke="#f59e0b" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="spread" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Contribution Curve</h2>
        </div>
        <ChartContainer config={{ value: { label: "Value", color: "#34d399" } }} className="h-[260px] w-full">
          <AreaChart data={summary.topContributors.map((holding) => ({ symbol: holding.symbol, value: Math.round(holding.pnl) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="symbol" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="value" fill="#34d399" fillOpacity={0.18} stroke="#34d399" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </section>
    </div>
  )
}

function Metric({ label, value, valueClass = "text-foreground" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border-l border-border p-4 first:border-l-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function InsightCard({ icon: Icon, label, value, caption }: { icon: typeof Target; label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
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

function RiskStat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold text-foreground ${compact ? "text-xs leading-snug" : "text-base"}`}>{value}</p>
    </div>
  )
}
