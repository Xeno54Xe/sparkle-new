"use client"
import { use, useEffect, useState } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react"
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
  const { symbol } = use(params)
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

  return(
    <div className="flex min-h-screen bg-background"><StockSidebar/><div className="flex flex-1 flex-col lg:pl-[260px]"><main className="flex-1 p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">{symbol} Financials</h1><p className="text-sm text-muted-foreground">Income, Balance Sheet & Cash Flow (annual, live from Yahoo Finance)</p></div>
      <div className="flex gap-2">{[{id:"income",l:"Income Statement"},{id:"balance",l:"Balance Sheet"},{id:"cashflow",l:"Cash Flow"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab===t.id?"bg-primary text-primary-foreground shadow-lg":"bg-secondary text-muted-foreground"}`}>{t.l}</button>)}</div>
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 size={20} className="animate-spin"/> Loading financials...</div>
      ) : !data || incomeYears.length === 0 && !bsYear && !cfYear ? (
        <div className="text-center py-20 text-muted-foreground">No financial statements available for {symbol}. Is the backend running?</div>
      ) : (<>
      {tab==="income"&&<Card><CardHeader className="pb-3"><CardTitle>Income Statement</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr className="border-b border-border">{["",fy(cur),fy(prev),"Growth"].map((h,i)=><th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead><tbody>{income.map((r,i)=><tr key={i} className={`border-b border-border/50 ${r.h?"bg-primary/5":""}`}><td className={`px-4 py-3 ${r.h?"font-bold text-primary":"font-medium"}`}>{r.l}</td><td className="px-4 py-3">{crore(r.a)}</td><td className="px-4 py-3 text-muted-foreground">{crore(r.b)}</td><td className={`px-4 py-3 font-semibold ${r.g==null?"text-muted-foreground":r.g>=0?"text-primary":"text-destructive"}`}>{r.g==null?"—":`${r.g>=0?"+":""}${r.g.toFixed(1)}%`}</td></tr>)}</tbody></table></CardContent></Card>}
      {tab==="balance"&&<Card><CardHeader className="pb-3"><CardTitle>Balance Sheet ({fy(bsYear)})</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">{balance.map((r,i)=><div key={i} className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground mb-1">{r.l}</p><p className="text-lg font-semibold">{crore(r.v)}</p></div>)}</div></CardContent></Card>}
      {tab==="cashflow"&&<Card><CardHeader className="pb-3"><CardTitle>Cash Flow ({fy(cfYear)})</CardTitle></CardHeader><CardContent className="space-y-3">{cf.map((r,i)=>{const u=(r.v??0)>=0;return<div key={i} className="flex justify-between items-center rounded-lg bg-secondary/30 px-4 py-3"><span className="text-sm">{r.l}</span><div className="flex items-center gap-2">{r.v==null?null:u?<TrendingUp size={14} className="text-primary"/>:<TrendingDown size={14} className="text-destructive"/>}<span className={`font-semibold ${r.v==null?"text-muted-foreground":u?"text-primary":"text-destructive"}`}>{crore(r.v)}</span></div></div>})}</CardContent></Card>}
      </>)}
    </main></div></div>)
}
