"use client"

import { use, useEffect, useState } from "react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { MarketLoader } from "@/components/ui/market-loader"
import { getStockBySymbol } from "@/lib/stocks"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

type Statement = Record<string, Record<string, number>>
type Tone = "good" | "ok" | "weak" | "na"

const FINANCIAL_SECTORS = new Set(["Banking", "Finance", "Insurance"])

function latest(st?: Statement) {
  if (!st) return undefined
  const year = Object.keys(st).sort((a, b) => b.localeCompare(a))[0]
  return year ? { year, row: st[year] } : undefined
}
const pick = (row: Record<string, number> | undefined, ...keys: string[]) => {
  for (const k of keys) { const v = row?.[k]; if (typeof v === "number" && v !== 0) return v }
  return null
}
const crore = (v: number | null) => v == null ? "—" : `${v < 0 ? "-" : ""}₹${Math.abs(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`

interface Metric { label: string; value: string; tone: Tone; note: string }

function grade(v: number | null, good: (v: number) => boolean, ok: (v: number) => boolean): Tone {
  if (v == null || !isFinite(v)) return "na"
  return good(v) ? "good" : ok(v) ? "ok" : "weak"
}

const TONE_STYLE: Record<Tone, string> = {
  good: "text-up",
  ok: "text-warning",
  weak: "text-down",
  na: "text-faint-foreground",
}
const TONE_LABEL: Record<Tone, string> = { good: "Comfortable", ok: "Watch", weak: "Stretched", na: "Not available" }

export default function CreditPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  const stock = getStockBySymbol(symbol)
  const [metrics, setMetrics] = useState<Metric[] | null>(null)
  const [amounts, setAmounts] = useState<{ label: string; value: string }[]>([])
  const [year, setYear] = useState<string>("")
  const [failed, setFailed] = useState(false)

  useEffect(() => { document.title = `${symbol} Debt & liquidity — SparkleAI` }, [symbol])

  useEffect(() => {
    let cancelled = false
    setMetrics(null)
    setFailed(false)
    Promise.all([
      fetch(`${API_BASE}/financials/${encodeURIComponent(symbol)}.NS`).then(r => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/stock-info/${encodeURIComponent(symbol)}.NS`).then(r => (r.ok ? r.json() : null)),
    ]).then(([fin, info]) => {
      if (cancelled) return
      const bs = latest(fin?.balance_sheet)
      const is = latest(fin?.income_statement)
      if (!bs && !is) { setFailed(true); return }
      setYear(bs?.year || is?.year || "")

      const debt = pick(bs?.row, "Total Debt")
      const cash = pick(bs?.row, "Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments")
      const netDebt = pick(bs?.row, "Net Debt") ?? (debt != null && cash != null ? debt - cash : null)
      const equity = pick(bs?.row, "Stockholders Equity", "Common Stock Equity")
      const ebitda = pick(is?.row, "EBITDA", "Normalized EBITDA")
      const ebit = pick(is?.row, "EBIT", "Operating Income")
      const interest = pick(is?.row, "Interest Expense", "Interest Expense Non Operating")
      const curRatio = info?.metrics?.current_ratio || null

      const de = debt != null && equity ? debt / equity : null
      const debtEbitda = debt != null && ebitda ? debt / ebitda : null
      const coverage = ebit != null && interest ? ebit / Math.abs(interest) : null

      setAmounts([
        { label: "Total debt", value: crore(debt) },
        { label: "Cash & equivalents", value: crore(cash) },
        { label: "Net debt", value: crore(netDebt) },
        { label: "Shareholders' equity", value: crore(equity) },
      ])
      setMetrics([
        { label: "Debt / equity", value: de == null ? "—" : `${de.toFixed(2)}×`, tone: grade(de, v => v < 0.5, v => v < 1.5), note: "Borrowings for every rupee of shareholder money. Under 0.5× is light; above 1.5× is heavy for a non-financial company." },
        { label: "Debt / EBITDA", value: debtEbitda == null ? "—" : `${debtEbitda.toFixed(2)}×`, tone: grade(debtEbitda, v => v < 1, v => v < 3), note: "Years of operating profit needed to repay all debt. Under 1× is comfortable; above 3× needs attention." },
        { label: "Interest coverage", value: coverage == null ? "—" : `${coverage.toFixed(1)}×`, tone: grade(coverage, v => v > 8, v => v > 3), note: "How many times operating profit covers interest. Above 8× is comfortable; under 3× is thin." },
        { label: "Current ratio", value: curRatio ? `${curRatio.toFixed(2)}` : "—", tone: grade(curRatio, v => v >= 1.5, v => v >= 1), note: "Short-term assets against short-term liabilities. Below 1 means bills due within a year exceed liquid assets." },
      ])
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [symbol])

  const isFinancial = stock && FINANCIAL_SECTORS.has(stock.sector)

  if (failed) {
    return <Panel><EmptyState title="Balance sheet data didn't load">Yahoo Finance returned no statements for {symbol}. Check that the backend is running.</EmptyState></Panel>
  }

  if (!metrics) {
    return <Panel aria-busy="true"><MarketLoader label="balance sheet data" /></Panel>
  }

  return (
    <div className="space-y-6">
      {isFinancial && (
        <p className="rounded-lg border border-line bg-surface px-5 py-3 text-sm text-muted-foreground">
          {stock?.name} is a {stock?.sector.toLowerCase()} company. Borrowing is its raw material, so leverage ratios read high by design; compare it with other lenders rather than with industrial companies.
        </p>
      )}

      <Panel aria-label="Debt ratios">
        <PanelHeader title="Debt ratios" description={year ? `Computed from the FY${year.slice(-2)} annual statements` : "Computed from the latest annual statements"} />
        <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 xl:grid-cols-4 xl:divide-x">
          {(metrics ?? [null, null, null, null]).map((m, i) => (
            <div key={m?.label ?? i} className="px-5 py-5">
              {m ? (
                <>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="figure mt-1.5 text-[28px] leading-none text-foreground">{m.value}</p>
                  <p className={cn("mt-2 text-sm font-medium", TONE_STYLE[isFinancial && m.label !== "Current ratio" ? "na" : m.tone])}>
                    {isFinancial && m.label !== "Current ratio" ? "Not comparable for lenders" : TONE_LABEL[m.tone]}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{m.note}</p>
                </>
              ) : (
                <div className="animate-pulse space-y-2.5"><div className="h-3.5 w-24 rounded bg-surface-2" /><div className="h-7 w-20 rounded bg-surface-2" /><div className="h-10 rounded bg-surface-2" /></div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel aria-label="Balance sheet amounts">
        <PanelHeader title="Balance sheet" />
        <dl className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
          {amounts.length ? amounts.map(a => (
            <div key={a.label} className="px-5 py-4">
              <dt className="text-sm text-muted-foreground">{a.label}</dt>
              <dd className="mt-1 text-lg font-medium tabular text-foreground">{a.value}</dd>
            </div>
          )) : [0, 1, 2, 3].map(i => <div key={i} className="px-5 py-4"><div className="h-10 animate-pulse rounded bg-surface-2" /></div>)}
        </dl>
      </Panel>
    </div>
  )
}
