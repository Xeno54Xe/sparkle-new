"use client"

import { use, useEffect, useState } from "react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Row { date: string; open: number; high: number; low: number; close: number; volume: number; change_pct: number | null }

const PERIODS = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
]

const inr = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const vol = (v: number) => (v >= 1e7 ? `${(v / 1e7).toFixed(2)} Cr` : `${(v / 1e5).toFixed(2)} L`)

export default function PricesPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  const [period, setPeriod] = useState("3mo")
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => { document.title = `${symbol} Price history — SparkleAI` }, [symbol])

  useEffect(() => {
    let cancelled = false
    setRows(null)
    setFailed(false)
    fetch(`${API_BASE}/history/${encodeURIComponent(symbol)}.NS?period=${period}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled) return
        if (j?.rows) setRows(j.rows)
        else setFailed(true)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [symbol, period])

  const summary = rows && rows.length > 1 ? {
    high: Math.max(...rows.map(r => r.high)),
    low: Math.min(...rows.map(r => r.low)),
    ret: ((rows[0].close - rows[rows.length - 1].close) / rows[rows.length - 1].close) * 100,
  } : null

  return (
    <Panel aria-label="Daily prices">
      <PanelHeader
        title="Daily prices"
        description={summary
          ? <span className="tabular">Range ₹{inr(summary.low)} – ₹{inr(summary.high)}<span className={cn("ml-3", summary.ret >= 0 ? "text-up" : "text-down")}>{summary.ret >= 0 ? "+" : ""}{summary.ret.toFixed(2)}% over the period</span></span>
          : "Open, high, low, close and volume for each session"}
        actions={
          <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Period">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={cn("rounded px-2.5 py-1 text-xs", period === p.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      {failed ? (
        <EmptyState title="Price history didn't load">Yahoo Finance returned no data for {symbol}. Check that the backend is running and try another period.</EmptyState>
      ) : (
        <div className="max-h-[70vh] overflow-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Date</th>
                {["Open", "High", "Low", "Close", "Change", "Volume"].map(h => (
                  <th key={h} scope="col" className="px-5 py-2.5 text-right font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(rows ?? Array.from({ length: 12 }, () => null)).map((r, i) => (
                <tr key={r?.date ?? i} className="hover:bg-surface-2/50">
                  {r ? (
                    <>
                      <td className="px-5 py-2.5 text-foreground">{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{inr(r.open)}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{inr(r.high)}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{inr(r.low)}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-foreground">{inr(r.close)}</td>
                      <td className={cn("px-5 py-2.5 text-right", r.change_pct == null ? "text-faint-foreground" : r.change_pct >= 0 ? "text-up" : "text-down")}>
                        {r.change_pct == null ? "—" : `${r.change_pct >= 0 ? "+" : ""}${r.change_pct.toFixed(2)}%`}
                      </td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{vol(r.volume)}</td>
                    </>
                  ) : (
                    <td colSpan={7} className="px-5 py-3"><div className="h-3.5 animate-pulse rounded bg-surface-2" /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
