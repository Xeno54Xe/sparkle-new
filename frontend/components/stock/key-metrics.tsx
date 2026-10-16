"use client"

import { useEffect, useState } from "react"
import { Panel, PanelHeader } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import type { Stock } from "@/lib/stocks"

function formatCap(num: number | null | undefined): string {
  if (!num) return "—"
  const cr = num / 1e7
  if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)} L Cr`
  return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`
}
const fixed = (v?: number | null, suffix = "") => (v ? `${v.toFixed(2)}${suffix}` : "—")
const rupee = (v?: number | null) => (v ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—")
const volume = (v?: number | null) => (v ? (v >= 1e7 ? `${(v / 1e7).toFixed(2)} Cr` : `${(v / 1e5).toFixed(2)} L`) : "—")

interface Info {
  sector?: string
  industry?: string
  price?: { day_high?: number; day_low?: number; fifty_two_week_high?: number; fifty_two_week_low?: number; volume?: number; avg_volume?: number }
  metrics?: Record<string, number>
}

export function KeyMetrics({ stock }: { stock: Stock }) {
  const [data, setData] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/stock-info/${encodeURIComponent(stock.symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled) setData(j && !j.error ? j : null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stock.symbol])

  const m = data?.metrics
  const p = data?.price
  // Grouped so related numbers sit together
  const groups = [
    {
      title: "Valuation",
      rows: [
        ["Market cap", formatCap(m?.market_cap)],
        ["P/E (trailing)", fixed(m?.pe_ratio)],
        ["P/E (forward)", fixed(m?.forward_pe)],
        ["Price / book", fixed(m?.pb_ratio)],
      ],
    },
    {
      title: "Earnings & returns",
      rows: [
        ["EPS (trailing)", rupee(m?.eps)],
        ["Return on equity", fixed(m?.roe, "%")],
        ["Dividend yield", fixed(m?.dividend_yield, "%")],
        ["Book value / share", rupee(m?.book_value)],
      ],
    },
    {
      title: "Balance sheet & risk",
      rows: [
        // Yahoo reports debt/equity as a percentage (e.g. 32 = 0.32×)
        ["Debt / equity", m?.debt_to_equity ? `${(m.debt_to_equity / 100).toFixed(2)}×` : "—"],
        ["Current ratio", fixed(m?.current_ratio)],
        ["Beta", fixed(m?.beta)],
        ["Industry", data?.industry || stock.sector],
      ],
    },
    {
      title: "Trading",
      rows: [
        ["Day range", p?.day_low ? `${rupee(p.day_low)} – ${rupee(p.day_high)}` : "—"],
        ["52-week range", p?.fifty_two_week_low ? `${rupee(p.fifty_two_week_low)} – ${rupee(p.fifty_two_week_high)}` : "—"],
        ["Volume", volume(p?.volume)],
        ["Avg volume", volume(p?.avg_volume)],
      ],
    },
  ]

  return (
    <Panel aria-label="Key metrics">
      <PanelHeader
        title="Key metrics"
        description={loading ? "Loading from Yahoo Finance…" : data ? "Latest from Yahoo Finance" : "Metrics are unavailable right now"}
      />
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {groups.map(g => (
          <div key={g.title} className="px-5 py-4">
            <h3 className="mb-2 text-xs font-medium text-faint-foreground">{g.title}</h3>
            <dl className="space-y-2">
              {g.rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className={loading ? "h-3.5 w-16 animate-pulse rounded bg-surface-2" : "text-right tabular text-foreground"}>
                    {loading ? "" : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  )
}
