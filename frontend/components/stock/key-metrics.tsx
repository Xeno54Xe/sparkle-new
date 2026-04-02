"use client"

import { useEffect, useState } from "react"
import type { Stock } from "@/lib/stocks"

interface KeyMetricsProps {
  stock: Stock
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}"

function formatNum(num: number | null | undefined): string {
  if (!num || num === 0) return "N/A"
  const abs = Math.abs(num)
  if (abs >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

export function KeyMetrics({ stock }: KeyMetricsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/stock-info/${stock.symbol}.NS`)
        if (res.ok) {
          const text = await res.text()
          try { setData(JSON.parse(text)) } catch { }
        }
      } catch (e) {
        console.error("Metrics fetch error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [stock.symbol])

  // Fallback to generated data if API fails
  const metrics = data?.metrics
    ? [
        { label: "Market Cap", value: formatNum(data.metrics.market_cap) },
        { label: "P/E Ratio", value: data.metrics.pe_ratio?.toFixed(2) || "N/A" },
        { label: "Forward P/E", value: data.metrics.forward_pe?.toFixed(2) || "N/A" },
        { label: "P/B Ratio", value: data.metrics.pb_ratio?.toFixed(2) || "N/A" },
        { label: "EPS", value: data.metrics.eps ? `₹${data.metrics.eps.toFixed(2)}` : "N/A" },
        { label: "Dividend Yield", value: data.metrics.dividend_yield ? `${data.metrics.dividend_yield.toFixed(2)}%` : "N/A" },
        { label: "ROE", value: data.metrics.roe ? `${data.metrics.roe.toFixed(2)}%` : "N/A" },
        { label: "Debt/Equity", value: data.metrics.debt_to_equity?.toFixed(2) || "N/A" },
        { label: "Current Ratio", value: data.metrics.current_ratio?.toFixed(2) || "N/A" },
        { label: "Beta", value: data.metrics.beta?.toFixed(2) || "N/A" },
        { label: "Book Value", value: data.metrics.book_value ? `₹${data.metrics.book_value.toFixed(2)}` : "N/A" },
        { label: "Sector", value: data.sector || stock.sector },
      ]
    : [
        { label: "Market Cap", value: "Loading..." },
        { label: "P/E Ratio", value: "..." },
        { label: "P/B Ratio", value: "..." },
        { label: "EPS", value: "..." },
        { label: "Dividend Yield", value: "..." },
        { label: "ROE", value: "..." },
        { label: "Debt/Equity", value: "..." },
        { label: "Current Ratio", value: "..." },
        { label: "Beta", value: "..." },
        { label: "Volume", value: "..." },
        { label: "Avg Volume", value: "..." },
        { label: "Sector", value: stock.sector },
      ]

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Key Metrics</h3>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Fetching live data...</span>}
        {!loading && data?.metrics && <span className="text-xs text-primary">Live data</span>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-background p-3">
            <p className="mb-1 text-xs text-muted-foreground">{metric.label}</p>
            <p className="text-sm font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
