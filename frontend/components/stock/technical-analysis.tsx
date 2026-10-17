"use client"

import { useState, useEffect } from "react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MarketLoader } from "@/components/ui/market-loader"

interface TechnicalAnalysisProps { symbol: string }

// Same weighting as the backend signal_service so the verdict matches the screener.
function calcVerdict(d: any) {
  const p = d.price || 0
  const ts = ([p > d.SMA50, p > d.SMA200, p > d.EMA20, p > d.EMA9, p > d.ichimokuTenkan, p > d.ichimokuKijun].filter(Boolean).length / 6) * 100
  const ms = ([d.MACD > d.MACDSignal, d.MACDHist > 0, d.ROC > 0, d.ADX > 25].filter(Boolean).length / 4) * 100
  const rf = (v: number, lo: number, hi: number) => (v < lo ? 1 : v > hi ? 0 : 0.5)
  const os = ([rf(d.RSI, 30, 70), rf(d.stochK, 20, 80), rf(d.CCI, -100, 100), rf(d.WilliamsR, -80, -20), rf(d.MFI, 20, 80)].reduce((a, b) => a + b, 0) / 5) * 100
  const vs = ([p > d.VWAP, d.OBV > 0].filter(Boolean).length / 2) * 100
  const cb = d.candle?.type === "bullish" ? 1 : d.candle?.type === "bearish" ? 0 : 0.5
  const cv = Object.values(d.crossovers || {}) as any[]
  const csc = cv.filter(x => x.status === "Bullish").length / (cv.length || 1)
  const ps = ((cb + csc) / 2) * 100
  const ov = Math.round(ts * 0.25 + ms * 0.25 + os * 0.2 + vs * 0.15 + ps * 0.15)
  const buys = [p > d.SMA50, p > d.SMA200, p > d.EMA20, p > d.VWAP, d.MACD > d.MACDSignal, d.ROC > 0, d.RSI < 30, d.stochK < 20, d.CCI < -100, d.WilliamsR < -80, d.MFI < 20].filter(Boolean).length
  const sells = [p < d.SMA50, p < d.SMA200, p < d.EMA20, p < d.VWAP, d.MACD < d.MACDSignal, d.ROC < 0, d.RSI > 70, d.stochK > 80, d.CCI > 100, d.WilliamsR > -20, d.MFI > 80].filter(Boolean).length
  return {
    ov, buys, sells, neutral: 11 - buys - sells,
    sig: ov >= 60 ? "BUY" : ov <= 40 ? "SELL" : "HOLD",
    parts: [
      { label: "Trend", weight: "25%", score: Math.round(ts) },
      { label: "Momentum", weight: "25%", score: Math.round(ms) },
      { label: "Oscillators", weight: "20%", score: Math.round(os) },
      { label: "Volume", weight: "15%", score: Math.round(vs) },
      { label: "Patterns", weight: "15%", score: Math.round(ps) },
    ],
  }
}

type Read = "Bullish" | "Bearish" | "Neutral" | "Strong" | "Weak"
const READ_STYLE: Record<Read, string> = {
  Bullish: "text-up",
  Strong: "text-up",
  Bearish: "text-down",
  Weak: "text-muted-foreground",
  Neutral: "text-muted-foreground",
}
const SIGNAL_STYLE: Record<string, string> = {
  BUY: "bg-up/15 text-up",
  SELL: "bg-down/15 text-down",
  HOLD: "bg-primary/15 text-primary",
}

export function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/full/${encodeURIComponent(symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled) setD(j?.indicators ?? null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol])

  if (loading) return (
    <Panel aria-busy="true"><MarketLoader label="technical indicators" /></Panel>
  )
  if (!d) return <Panel><EmptyState title="No technical data">Price history for {symbol} didn&apos;t load. Check that the backend is running.</EmptyState></Panel>

  const v = calcVerdict(d)
  const crossovers = Object.values(d.crossovers || {}) as any[]
  const above = (level: number) => (d.price > level ? "Bullish" : "Bearish") as Read
  const osc = (val: number, lo: number, hi: number): Read => (val < lo ? "Bullish" : val > hi ? "Bearish" : "Neutral")
  const n = (x: number | null | undefined, digits = 1) => (x == null ? "—" : x.toFixed(digits))
  const inr = (x: number | null | undefined) => (x ? `₹${x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—")

  const indicators: { group: string; rows: { name: string; value: string; read: Read; hint: string }[] }[] = [
    {
      group: "Trend",
      rows: [
        { name: "SMA 50", value: inr(d.SMA50), read: above(d.SMA50), hint: d.price > d.SMA50 ? "Price above" : "Price below" },
        { name: "SMA 200", value: inr(d.SMA200), read: above(d.SMA200), hint: d.price > d.SMA200 ? "Long-term uptrend" : "Long-term downtrend" },
        { name: "EMA 20", value: inr(d.EMA20), read: above(d.EMA20), hint: d.price > d.EMA20 ? "Price above" : "Price below" },
        { name: "VWAP (20d)", value: inr(d.VWAP), read: above(d.VWAP), hint: d.price > d.VWAP ? "Price above" : "Price below" },
      ],
    },
    {
      group: "Momentum",
      rows: [
        { name: "MACD", value: n(d.MACD, 2), read: d.MACD > d.MACDSignal ? "Bullish" : "Bearish", hint: `Signal ${n(d.MACDSignal, 2)}` },
        { name: "ROC (12)", value: `${n(d.ROC)}%`, read: d.ROC > 0 ? "Bullish" : "Bearish", hint: "12-day change" },
        { name: "ADX (14)", value: n(d.ADX), read: d.ADX > 25 ? "Strong" : "Weak", hint: d.ADX > 25 ? "Trend is strong" : "No clear trend" },
      ],
    },
    {
      group: "Oscillators",
      rows: [
        { name: "RSI (14)", value: n(d.RSI), read: osc(d.RSI, 30, 70), hint: d.RSI < 30 ? "Oversold" : d.RSI > 70 ? "Overbought" : "30–70 range" },
        { name: "Stochastic %K", value: n(d.stochK), read: osc(d.stochK, 20, 80), hint: d.stochK < 20 ? "Oversold" : d.stochK > 80 ? "Overbought" : "20–80 range" },
        { name: "CCI (20)", value: n(d.CCI), read: osc(d.CCI, -100, 100), hint: "±100 bands" },
        { name: "Williams %R", value: n(d.WilliamsR), read: osc(d.WilliamsR, -80, -20), hint: "−80 to −20 range" },
        { name: "MFI (14)", value: n(d.MFI), read: osc(d.MFI, 20, 80), hint: "Volume-weighted RSI" },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Verdict */}
        <Panel className="lg:col-span-4" aria-label="Technical verdict">
          <PanelHeader title="Technical verdict" description="Weighted score across 15 indicators" />
          <div className="px-5 py-5">
            <div className="flex items-end justify-between">
              <p className="figure text-5xl leading-none text-foreground">{v.ov}<span className="ml-1 text-lg font-normal text-faint-foreground">/100</span></p>
              <span className={cn("rounded-md px-3 py-1 text-sm font-semibold", SIGNAL_STYLE[v.sig])}>{v.sig}</span>
            </div>
            {/* Score scale: sell ≤ 40 < hold < 60 ≤ buy */}
            <div className="relative mt-5 h-1.5 rounded-full bg-surface-2">
              <div className="absolute inset-y-0 left-0 w-[40%] rounded-l-full bg-down/40" />
              <div className="absolute inset-y-0 left-[60%] right-0 rounded-r-full bg-up/40" />
              <div className="absolute -top-1 h-3.5 w-1 -translate-x-1/2 rounded bg-foreground" style={{ left: `${v.ov}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-faint-foreground"><span>Sell</span><span>Hold</span><span>Buy</span></div>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[{ l: "Buy signals", v: v.buys, c: "text-up" }, { l: "Sell signals", v: v.sells, c: "text-down" }, { l: "Neutral", v: v.neutral, c: "text-muted-foreground" }].map(x => (
                <div key={x.l} className="rounded-md bg-surface-2/60 py-2">
                  <dd className={cn("text-lg font-semibold tabular", x.c)}>{x.v}</dd>
                  <dt className="text-xs text-muted-foreground">{x.l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {v.parts.map(part => (
              <li key={part.label} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-24 text-muted-foreground">{part.label}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", part.score >= 60 ? "bg-up" : part.score <= 40 ? "bg-down" : "bg-primary")} style={{ width: `${part.score}%` }} />
                </div>
                <span className="w-8 text-right tabular text-foreground">{part.score}</span>
                <span className="w-9 text-right text-xs text-faint-foreground">{part.weight}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Indicators */}
        <Panel className="lg:col-span-8" aria-label="Indicators">
          <PanelHeader title="Indicators" description={`Latest daily close ${inr(d.price)}`} />
          <div className="divide-y divide-line">
            {indicators.map(group => (
              <div key={group.group}>
                <h3 className="px-5 pb-1 pt-3 text-xs font-medium text-faint-foreground">{group.group}</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {group.rows.map(r => (
                      <tr key={r.name}>
                        <th scope="row" className="w-1/3 px-5 py-2 text-left font-normal text-foreground">{r.name}</th>
                        <td className="px-5 py-2 text-right tabular text-foreground">{r.value}</td>
                        <td className="hidden px-5 py-2 text-muted-foreground sm:table-cell">{r.hint}</td>
                        <td className={cn("px-5 py-2 text-right font-medium", READ_STYLE[r.read])}>{r.read}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {d.candle && (
          <Panel aria-label="Latest candle">
            <PanelHeader title="Latest candle" description={`Reliability: ${d.candle.reliability}`} />
            <div className="px-5 py-4">
              <p className={cn("text-base font-medium", d.candle.type === "bullish" ? "text-up" : d.candle.type === "bearish" ? "text-down" : "text-foreground")}>{d.candle.latest}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.candle.description}</p>
            </div>
          </Panel>
        )}
        {crossovers.length > 0 && (
          <Panel aria-label="Moving-average crossovers">
            <PanelHeader title="Moving-average crossovers" />
            <ul className="divide-y divide-line">
              {crossovers.map((cr: any) => (
                <li key={cr.name} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-foreground">{cr.name}</span>
                  <span className="text-right">
                    <span className={cr.status === "Bullish" ? "text-up" : "text-down"}>{cr.status}</span>
                    <span className="ml-2 text-xs text-faint-foreground">{cr.daysAgo}d ago</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {d.support && d.resistance && (
          <Panel aria-label="Pivot levels">
            <PanelHeader title="Pivot levels" description={`Pivot ${inr(d.pivotPoint)}`} />
            <dl className="grid grid-cols-2 divide-x divide-line text-sm">
              <div className="space-y-1.5 px-5 py-3">
                {Object.entries(d.resistance).reverse().map(([k, val]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="tabular text-down">{inr(val as number)}</dd></div>
                ))}
              </div>
              <div className="space-y-1.5 px-5 py-3">
                {Object.entries(d.support).map(([k, val]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="tabular text-up">{inr(val as number)}</dd></div>
                ))}
              </div>
            </dl>
          </Panel>
        )}
      </div>

      <p className="text-xs leading-relaxed text-faint-foreground">
        Technical signals are calculated from past prices and don&apos;t account for news, earnings or fundamentals. They are not investment advice.
      </p>
    </div>
  )
}
