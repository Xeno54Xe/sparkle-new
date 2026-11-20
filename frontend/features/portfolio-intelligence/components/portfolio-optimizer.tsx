"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis, ZAxis, Tooltip } from "recharts"
import { Check, Info, Undo2, Wand2 } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ChartContainer } from "@/components/ui/chart"
import type { DemoStock } from "@/lib/demo-prices"
import type { HoldingInput, MarketAnalytics, PortfolioSummary } from "../domain/portfolio-model"
import {
  optimize,
  rebalanceTrades,
  RISK_AVERSION,
  SHRINKAGE,
  TAU,
  VIEW_SCALE,
  type Objective,
  type ReturnModel,
  type SparkleView,
} from "../domain/optimizer"

const OBJECTIVES: Array<{ id: Objective; label: string; hint: string }> = [
  { id: "maxSharpe", label: "Best return for the risk", hint: "Maximum Sharpe ratio: the highest expected return above the risk-free rate per unit of volatility." },
  { id: "minVariance", label: "Lowest risk", hint: "Minimum variance: the least volatile mix, whatever the expected returns." },
  { id: "riskParity", label: "Equal risk", hint: "Risk parity: every stock contributes the same share of total risk. Ignores expected returns." },
]

const MODELS: Array<{ id: ReturnModel; label: string; hint: string }> = [
  { id: "blackLitterman", label: "Market + Sparkle views", hint: "Black-Litterman: start from the returns the market is pricing in, then tilt toward stocks our earnings-call, annual-report and Sparkle Report scores rate above their peers." },
  { id: "equilibrium", label: "Market-implied", hint: "Reverse optimisation: the returns that would make today's market-cap weights the best portfolio." },
  { id: "historical", label: "Past year", hint: "The trailing one-year average return. Shown for comparison: it is noisy and tends to chase last year's winners." },
]

const CONFIDENCE = [
  { value: 0.5, label: "Low" },
  { value: 1, label: "Normal" },
  { value: 2, label: "High" },
]

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
const signedPct = (v: number, digits = 1) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`
const rupees = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")}`

function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T
  options: Array<{ id: T; label: string; hint?: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-md border border-line bg-background p-1">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-8 rounded-[5px] px-3 text-[13px] transition-colors",
            value === o.id ? "bg-forest text-foreground shadow-[inset_0_0_0_1px_rgba(197,255,74,0.35)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Compare({ label, before, after, format, better }: {
  label: string
  before: number | null
  after: number
  format: (v: number) => string
  better: "higher" | "lower"
}) {
  // Compare what's shown: a change hidden by rounding isn't a change.
  const delta = before == null || format(before) === format(after) ? (before == null ? null : 0) : after - before
  const good = delta != null && (better === "higher" ? delta > 1e-6 : delta < -1e-6)
  const bad = delta != null && (better === "higher" ? delta < -1e-6 : delta > 1e-6)
  return (
    <div className="bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="figure text-[28px] leading-none text-foreground">{format(after)}</span>
        {delta != null && (
          <span className={cn("text-xs tabular", good ? "text-up" : bad ? "text-down" : "text-faint-foreground")}>
            from {format(before!)}
          </span>
        )}
      </div>
    </div>
  )
}

export function PortfolioOptimizer({ summary, analytics, universe, onApply }: {
  summary: PortfolioSummary
  analytics: MarketAnalytics | null
  universe: DemoStock[]
  onApply: (holdings: HoldingInput[]) => void
}) {
  const [scope, setScope] = useState<"holdings" | "nifty">("holdings")
  const [objective, setObjective] = useState<Objective>("maxSharpe")
  const [model, setModel] = useState<ReturnModel>("blackLitterman")
  const [confidence, setConfidence] = useState(1)
  const [capPct, setCapPct] = useState(25)
  const cap = useDeferredValue(capPct) / 100
  const [views, setViews] = useState<Record<string, SparkleView> | null>(null)
  const [viewsState, setViewsState] = useState<"loading" | "ready" | "error">("loading")
  const [previous, setPrevious] = useState<HoldingInput[] | null>(null)

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/portfolio/views`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.views && typeof data.views === "object") {
          setViews(data.views)
          setViewsState("ready")
        } else setViewsState("error")
      })
      .catch(() => active && setViewsState("error"))
    return () => { active = false }
  }, [])

  const effectiveModel: ReturnModel = model === "blackLitterman" && !views ? "equilibrium" : model

  const result = useMemo(() => {
    if (!analytics) return null
    const held = summary.holdings.filter((h) => analytics.returns[h.symbol])
    const symbols = scope === "nifty"
      ? Object.keys(analytics.returns).filter((s) => analytics.stocks[s])
      : Array.from(new Set(held.map((h) => h.symbol)))
    if (symbols.length < 2) return null
    const value = held.reduce((s, h) => s + h.value, 0)
    const current = symbols.map((s) => held.filter((h) => h.symbol === s).reduce((acc, h) => acc + h.value, 0) / (value || 1))
    return optimize({
      symbols,
      returns: symbols.map((s) => analytics.returns[s]),
      marketCaps: symbols.map((s) => analytics.stocks[s]?.market_cap ?? null),
      riskFree: analytics.risk_free,
      views: views ?? undefined,
      viewConfidence: confidence,
      model: effectiveModel,
      objective,
      cap,
      current,
    })
  }, [analytics, summary.holdings, scope, views, confidence, effectiveModel, objective, cap])

  const prices = useMemo(() => Object.fromEntries(universe.map((s) => [s.symbol, s.price])), [universe])
  const shares = useMemo(() => {
    const out: Record<string, number> = {}
    for (const h of summary.holdings) out[h.symbol] = (out[h.symbol] ?? 0) + h.quantity
    return out
  }, [summary.holdings])

  const trades = useMemo(
    () => (result
      ? rebalanceTrades(result.symbols, result.optimal.weights, prices, shares, summary.totalValue)
          // Trades under 2% of the portfolio aren't worth the brokerage: hold instead.
          .map((t) => (Math.abs(t.amount) < 0.02 * summary.totalValue ? { ...t, targetShares: t.currentShares, shares: 0, amount: 0 } : t))
      : []),
    [result, prices, shares, summary.totalValue],
  )
  const moves = trades.filter((t) => t.shares !== 0)
  const turnover = moves.reduce((s, t) => s + Math.abs(t.amount), 0) / 2

  const minCap = result ? Math.ceil(100 / result.symbols.length) : 5
  const uncovered = summary.holdings.filter((h) => analytics && !analytics.returns[h.symbol]).map((h) => h.symbol)

  const apply = () => {
    const avg = Object.fromEntries(summary.holdings.map((h) => [h.symbol, h.averagePrice]))
    setPrevious(summary.holdings.map(({ symbol, quantity, averagePrice }) => ({ symbol, quantity, averagePrice })))
    onApply(trades.filter((t) => t.targetShares > 0).map((t) => ({ symbol: t.symbol, quantity: t.targetShares, averagePrice: avg[t.symbol] ?? t.price })))
  }

  const undo = () => {
    if (previous) onApply(previous)
    setPrevious(null)
  }

  const rows = result
    ? result.symbols
        .map((symbol, i) => ({
          symbol,
          current: result.current?.weights[i] ?? 0,
          target: result.optimal.weights[i],
          expected: result.expected[i],
          equilibrium: result.equilibrium[i],
          risk: result.riskContribution[i],
          view: views?.[symbol] ?? null,
        }))
        .filter((r) => r.target >= 0.005 || r.current >= 0.005)
        .sort((a, b) => b.target - a.target || b.current - a.current)
    : []

  const chart = result
    ? {
        frontier: result.frontier.map((p) => ({ x: p.vol * 100, y: p.ret * 100 })),
        stocks: result.symbols.map((s, i) => ({ x: result.volatility[i] * 100, y: result.expected[i] * 100, name: s })),
        current: result.current ? [{ x: result.current.vol * 100, y: result.current.ret * 100, name: "Your portfolio" }] : [],
        optimal: [{ x: result.optimal.vol * 100, y: result.optimal.ret * 100, name: "Optimised" }],
      }
    : null

  return (
    <section id="optimizer" className="panel min-w-0 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wand2 size={20} className="text-primary" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Optimise</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Suggested weights from a year of daily prices, long only, with the trades to get there. A model, not advice: it assumes the past year&apos;s risk carries forward.
          </p>
        </div>
        <Segmented
          label="Stocks to choose from"
          value={scope}
          onChange={setScope}
          options={[{ id: "holdings", label: "My holdings" }, { id: "nifty", label: "All Nifty 50" }]}
        />
      </div>

      <div className="grid gap-4 border-b border-line p-4 sm:p-5 xl:grid-cols-[auto_auto_minmax(220px,1fr)]">
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">Goal</p>
          <Segmented label="Goal" value={objective} onChange={setObjective} options={OBJECTIVES} />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">Expected returns</p>
          <Segmented label="Expected returns" value={model} onChange={setModel} options={MODELS} />
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Most in one stock</span>
              <span className="tabular text-foreground">{Math.max(capPct, minCap)}%</span>
            </span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={capPct}
              onChange={(e) => setCapPct(Number(e.target.value))}
              className="h-8 w-full accent-[#C5FF4A]"
            />
          </label>
          {model === "blackLitterman" && (
            <div className="min-w-0">
              <p className="mb-2 text-xs text-muted-foreground">Trust in Sparkle views</p>
              <Segmented label="Trust in Sparkle views" value={confidence} onChange={setConfidence} options={CONFIDENCE.map((c) => ({ id: c.value, label: c.label }))} />
            </div>
          )}
        </div>
      </div>

      {!analytics ? (
        <p className="p-5 text-sm text-muted-foreground">The optimiser needs the year of market history above. It will appear when that loads.</p>
      ) : !result ? (
        <p className="p-5 text-sm text-muted-foreground">Add at least two Nifty 50 stocks to optimise them, or switch to All Nifty 50.</p>
      ) : (
        <>
          {(model === "blackLitterman" && viewsState === "error") || uncovered.length > 0 ? (
            <div className="flex items-start gap-2 border-b border-line bg-background/60 px-5 py-3 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0 text-warning" />
              <span>
                {model === "blackLitterman" && viewsState === "error" && "Sparkle views couldn't load, so this uses market-implied returns. "}
                {uncovered.length > 0 && `${uncovered.join(", ")} ${uncovered.length === 1 ? "has" : "have"} no price history yet and ${uncovered.length === 1 ? "is" : "are"} left out.`}
              </span>
            </div>
          ) : null}

          <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            <Compare label="Expected return, next year" before={result.current?.ret ?? null} after={result.optimal.ret} format={(v) => pct(v)} better="higher" />
            <Compare label="Volatility" before={result.current?.vol ?? null} after={result.optimal.vol} format={(v) => pct(v)} better="lower" />
            <Compare label="Sharpe ratio" before={result.current?.sharpe ?? null} after={result.optimal.sharpe} format={(v) => v.toFixed(2)} better="higher" />
            <div className="bg-surface p-4">
              <p className="text-xs text-muted-foreground">To rebalance</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="figure text-[28px] leading-none text-foreground">{rupees(turnover)}</span>
                <span className="text-xs text-faint-foreground">{moves.length} trade{moves.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="min-w-0 border-b border-line p-4 sm:p-5 xl:border-b-0 xl:border-r">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-medium text-foreground">Efficient frontier</h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground" />Yours</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Optimised</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-faint-foreground" />Stocks</span>
                </div>
              </div>
              <ChartContainer config={{ y: { label: "Expected return" } }} className="h-[320px] w-full">
                <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Volatility" unit="%" tickFormatter={(v) => Number(v).toFixed(0)} domain={["dataMin - 2", "dataMax + 2"]}
                    label={{ value: "Volatility (risk)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#8E9C93" }} />
                  <YAxis type="number" dataKey="y" name="Expected return" unit="%" tickFormatter={(v) => Number(v).toFixed(0)} domain={["auto", "auto"]} width={44} />
                  <ZAxis range={[36, 36]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      const p = payload?.[0]?.payload as { x: number; y: number; name?: string } | undefined
                      if (!p) return null
                      return (
                        <div className="rounded-md border border-line-strong bg-obsidian/95 px-2.5 py-2 text-xs">
                          {p.name && <p className="mb-1 font-medium text-foreground">{p.name}</p>}
                          <p className="tabular text-muted-foreground">Return {p.y.toFixed(1)}% · Risk {p.x.toFixed(1)}%</p>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={chart!.stocks} fill="#5E6A63" />
                  <Scatter data={chart!.frontier} fill="#C5FF4A" line={{ stroke: "#C5FF4A", strokeWidth: 2 }} shape={() => <g />} legendType="none" />
                  <Scatter data={chart!.current} fill="#EEF2EC" shape="diamond" />
                  <Scatter data={chart!.optimal} fill="#C5FF4A" shape="star" />
                </ScatterChart>
              </ChartContainer>
              <p className="mt-2 text-xs leading-relaxed text-faint-foreground">
                The line is the best expected return available at each level of risk, within the limit on any one stock. Portfolios below it take risk they aren&apos;t paid for.
              </p>
            </div>

            <div className="min-w-0 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">Suggested weights and trades</h3>
                <div className="flex items-center gap-2">
                  {previous && (
                    <button type="button" onClick={undo} className="flex h-9 items-center gap-2 rounded-md border border-line-strong px-3 text-sm text-foreground hover:bg-forest">
                      <Undo2 size={15} /> Undo
                    </button>
                  )}
                  <button type="button" onClick={apply} disabled={moves.length === 0} className="btn-lime h-9 px-4 text-sm disabled:opacity-40">
                    <Check size={15} /> {moves.length === 0 ? "Already optimised" : "Apply to my portfolio"}
                  </button>
                </div>
              </div>
              <div className="max-h-[360px] overflow-auto rounded-md border border-line">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="sticky top-0 bg-surface-2 text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-2 text-left font-normal">Stock</th>
                      <th className="px-2.5 py-2 text-right font-normal">Now</th>
                      <th className="px-2.5 py-2 text-left font-normal">Target</th>
                      <th className="px-2.5 py-2 text-right font-normal" title="Expected return used by the optimiser">Exp. return</th>
                      <th className="px-2.5 py-2 text-right font-normal" title="Average of the stock's earnings-call, annual-report and Sparkle Report scores">Sparkle</th>
                      <th className="px-2.5 py-2 text-right font-normal">Trade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const t = trades.find((x) => x.symbol === r.symbol)
                      const tilt = r.expected - r.equilibrium
                      return (
                        <tr key={r.symbol} className="border-t border-line">
                          <td className="px-2.5 py-2 font-medium text-foreground">{r.symbol}</td>
                          <td className="px-2.5 py-2 text-right tabular text-muted-foreground">{pct(r.current)}</td>
                          <td className="px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-12 tabular text-foreground">{pct(r.target)}</span>
                              <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-line" aria-hidden="true">
                                <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.min(100, (r.target / result.cap) * 100)}%` }} />
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2 text-right tabular text-foreground" title={effectiveModel === "blackLitterman" ? `Market-implied ${pct(r.equilibrium)}, Sparkle views ${signedPct(tilt)}` : undefined}>
                            {pct(r.expected)}
                            {effectiveModel === "blackLitterman" && Math.abs(tilt) >= 0.001 && (
                              <span className={cn("ml-1 text-[11px]", tilt > 0 ? "text-up" : "text-down")}>{signedPct(tilt)}</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-right tabular text-muted-foreground" title={r.view?.sources.map((s) => `${s.source} (${s.period}): ${s.score}`).join("\n")}>
                            {r.view ? Math.round(r.view.score) : "—"}
                          </td>
                          <td className={cn("whitespace-nowrap px-2.5 py-2 text-right tabular", !t || t.shares === 0 ? "text-faint-foreground" : t.shares > 0 ? "text-up" : "text-down")}>
                            {!t || t.shares === 0 ? "Hold" : (
                              <>
                                {t.shares > 0 ? "Buy" : "Sell"} {Math.abs(t.shares)}
                                <span className="block text-[11px] text-faint-foreground">{rupees(t.amount)}</span>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-faint-foreground">
                Whole shares at live prices, keeping your total of {rupees(summary.totalValue)}; leftover cash is under one share of each stock. Stocks under 0.5% are dropped, and trades under 2% of the portfolio are skipped.
              </p>
            </div>
          </div>

          <details className="border-t border-line px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <summary className="cursor-pointer select-none text-foreground/80 hover:text-foreground">How this is calculated</summary>
            <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-4 leading-relaxed">
              <li>Risk: covariance of daily returns over {analytics.days} trading days, annualised, with correlations shrunk {Math.round(SHRINKAGE * 100)}% toward zero so one year of data doesn&apos;t produce extreme bets.</li>
              <li>Market-implied returns: reverse optimisation from market caps, π = δΣw, with risk aversion δ = {RISK_AVERSION}, plus the {pct(analytics.risk_free)} risk-free rate.</li>
              <li>Sparkle views ({result.viewsUsed} stocks here): each stock&apos;s average earnings-call and annual-report investment scores and Sparkle Report valuation and analyst scores, standardised against the other Nifty 50 names. One standard deviation above its peers means beating its market-implied return by {Math.round(VIEW_SCALE * 100)}% of its own volatility. Black-Litterman with τ = {TAU}; a view backed by fewer report types counts for less.</li>
              <li>Weights: long only, at most {Math.round(result.cap * 100)}% in one stock. Max Sharpe and the frontier are solved by projected gradient descent; risk parity equalises each stock&apos;s share of variance.</li>
              <li>Not included: brokerage, taxes and the price impact of trading.</li>
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
