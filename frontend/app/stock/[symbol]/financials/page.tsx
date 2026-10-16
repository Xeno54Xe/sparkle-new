"use client"
import { use, useEffect, useState } from "react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

interface Props { params: Promise<{ symbol: string }> }
type Statement = Record<string, Record<string, number>>
interface FinancialsData { income_statement?: Statement; balance_sheet?: Statement; cash_flow?: Statement }

// yfinance line items to show, in display order. The first key found wins.
const INCOME_ROWS = [
  { l: "Revenue", k: ["Total Revenue", "Operating Revenue"] },
  { l: "EBITDA", k: ["EBITDA", "Normalized EBITDA"] },
  { l: "Operating Income", k: ["Operating Income", "EBIT"] },
  { l: "Net Profit", k: ["Net Income", "Net Income Common Stockholders"], h: true },
]
const BALANCE_ROWS = [
  { l: "Total Assets", k: ["Total Assets"] },
  { l: "Total Liabilities", k: ["Total Liabilities Net Minority Interest"] },
  { l: "Equity", k: ["Stockholders Equity", "Common Stock Equity"] },
  { l: "Total Debt", k: ["Total Debt"] },
  { l: "Cash", k: ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"] },
  { l: "Net Debt", k: ["Net Debt"] },
]
const CASHFLOW_ROWS = [
  { l: "Operating CF", k: ["Operating Cash Flow"] },
  { l: "Capex", k: ["Capital Expenditure"] },
  { l: "Free CF", k: ["Free Cash Flow"] },
  { l: "Net CF", k: ["Changes In Cash"] },
]

function pick(row: Record<string, number> | undefined, keys: string[]): number | null {
  if (!row) return null
  for (const k of keys) {
    const v = row[k]
    if (typeof v === "number" && v !== 0) return v
  }
  return null
}

function crore(v: number | null): string {
  if (v == null) return "N/A"
  const cr = v / 1e7
  const sign = cr < 0 ? "-" : ""
  return `${sign}₹${Math.abs(cr).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`
}

function sortedYears(st?: Statement) {
  return st ? Object.keys(st).sort((a, b) => b.localeCompare(a)) : []
}

export default function FinancialsPage({ params }: Props) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  const [tab, setTab] = useState("income")
  const [data, setData] = useState<FinancialsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = `${symbol} Financials — SparkleAI`
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/financials/${encodeURIComponent(symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled) setData(j && !j.error ? j : null) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol])

  const incomeYears = sortedYears(data?.income_statement)
  const [cur, prev] = incomeYears
  const income = INCOME_ROWS.map(r => {
    const a = pick(data?.income_statement?.[cur], r.k)
    const b = pick(data?.income_statement?.[prev], r.k)
    const g = a != null && b != null && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null
    return { ...r, a, b, g }
  })
  const bsYear = sortedYears(data?.balance_sheet)[0]
  const balance = BALANCE_ROWS.map(r => ({ l: r.l, v: pick(data?.balance_sheet?.[bsYear], r.k) }))
  const cfYear = sortedYears(data?.cash_flow)[0]
  const cf = CASHFLOW_ROWS.map(r => ({ l: r.l, v: pick(data?.cash_flow?.[cfYear], r.k) }))
  const fy = (y?: string) => (y ? `FY${y.slice(-2)}` : "—")

  const TABS = [{ id: "income", l: "Income statement" }, { id: "balance", l: "Balance sheet" }, { id: "cashflow", l: "Cash flow" }]
  const noData = !loading && (!data || (incomeYears.length === 0 && !bsYear && !cfYear))

  return (
    <Panel aria-label="Financial statements">
      <PanelHeader
        title="Financial statements"
        description="Annual figures in ₹ crore, from Yahoo Finance"
        actions={
          <div className="flex rounded-md border border-line p-0.5" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn("rounded px-2.5 py-1 text-xs", tab === t.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {t.l}
              </button>
            ))}
          </div>
        }
      />
      {loading ? (
        <div className="space-y-3 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />)}</div>
      ) : noData ? (
        <EmptyState title="No statements available">Yahoo Finance has no annual statements for {symbol}. Check that the backend is running.</EmptyState>
      ) : tab === "income" ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 text-left font-medium">Line item</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">{fy(cur)}</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">{fy(prev)}</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {income.map(r => (
              <tr key={r.l}>
                <th scope="row" className={cn("px-5 py-3 text-left font-normal", r.h ? "font-medium text-foreground" : "text-muted-foreground")}>{r.l}</th>
                <td className={cn("px-5 py-3 text-right", r.h && "font-medium")}>{crore(r.a)}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">{crore(r.b)}</td>
                <td className={cn("px-5 py-3 text-right", r.g == null ? "text-faint-foreground" : r.g >= 0 ? "text-up" : "text-down")}>
                  {r.g == null ? "—" : `${r.g >= 0 ? "+" : ""}${r.g.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <dl className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {(tab === "balance" ? balance : cf).map(r => (
            <div key={r.l} className="border-line px-5 py-4 sm:border-b">
              <dt className="text-sm text-muted-foreground">{r.l}</dt>
              <dd className={cn("mt-1 text-lg font-medium tabular", r.v != null && r.v < 0 ? "text-down" : "text-foreground")}>{crore(r.v)}</dd>
            </div>
          ))}
          <p className="px-5 py-4 text-xs text-faint-foreground sm:col-span-2 lg:col-span-3">
            As of {fy(tab === "balance" ? bsYear : cfYear)}
          </p>
        </dl>
      )}
    </Panel>
  )
}
