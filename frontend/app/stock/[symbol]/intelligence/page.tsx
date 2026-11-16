"use client"

import { useState, use, useEffect } from "react"
import { FundamentalAnalysis } from "@/components/stock/fundamental-analysis"
import { TechnicalAnalysis } from "@/components/stock/technical-analysis"
import { cn } from "@/lib/utils"

interface IntelligencePageProps {
  params: Promise<{ symbol: string }>
}

const VIEWS = [
  { id: "fundamental", label: "Earnings calls & annual reports", short: "Fundamental" },
  { id: "technical", label: "Price signals & indicators", short: "Technical" },
] as const

export default function IntelligencePage({ params }: IntelligencePageProps) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  useEffect(() => { document.title = `${symbol} Intelligence — SparkleAI` }, [symbol])
  const [view, setView] = useState<"fundamental" | "technical">("fundamental")

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Analysis type">
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm transition-colors",
              view === v.id ? "bg-surface-2 font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="font-medium">{v.short}</span>
            <span className="ml-2 hidden text-xs text-muted-foreground md:inline">{v.label}</span>
          </button>
        ))}
      </div>
      {view === "fundamental" ? <FundamentalAnalysis symbol={symbol} /> : <TechnicalAnalysis symbol={symbol} />}
    </div>
  )
}
