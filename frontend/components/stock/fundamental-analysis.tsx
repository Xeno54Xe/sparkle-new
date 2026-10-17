"use client"

import { useState, useEffect } from "react"
import {
  Target, Brain, Leaf, FileText, AlertTriangle,
  TrendingUp, Lightbulb, Shield, Eye, MessageSquare,
  BarChart2,
} from "lucide-react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { companyFolder } from "@/lib/company-folders"
import { cn } from "@/lib/utils"

import { API_BASE } from "@/lib/api"
import { MarketLoader } from "@/components/ui/market-loader"
interface FundamentalAnalysisProps {
  symbol: string
}

const API = API_BASE


const SECTION_META: Record<string, { icon: React.ElementType; color: string }> = {
  financial_metrics:   { icon: TrendingUp,    color: "#2FB57C" },
  risk_intelligence:   { icon: AlertTriangle,  color: "#E35D5B" },
  esg:                 { icon: Leaf,           color: "#2FB57C" },
  speaker_sentiment:   { icon: MessageSquare,  color: "#6AA6F8" },
  qa_transparency:     { icon: Eye,            color: "#A48AF0" },
  overall_sentiment:   { icon: Target,         color: "#5BC0D8" },
  investment_synthesis:{ icon: Lightbulb,      color: "#F2A93B" },
  capital_structure:   { icon: Shield,         color: "#A48AF0" },
  management_discussion:{ icon: FileText,      color: "#8A95AB" },
  strategy:            { icon: Brain,          color: "#E07BB0" },
}

function scoreColor(v: number) {
  return v >= 70 ? "var(--up)" : v >= 40 ? "var(--primary)" : "var(--down)"
}

async function safeFetch(url: string) {
  try {
    const r = await fetch(url)
    if (!r.ok) {
      console.error(`[FundamentalAnalysis] HTTP ${r.status} for ${url}`)
      return null
    }
    const t = await r.text()
    try { return JSON.parse(t) } catch (e) {
      console.error(`[FundamentalAnalysis] JSON parse error for ${url}`, e)
      return null
    }
  } catch (e) {
    console.error(`[FundamentalAnalysis] Fetch failed for ${url}`, e)
    return null
  }
}

type Category = "EC" | "AR"
interface ReportItem { period: string; label: string }
interface ReportList { earnings_calls: ReportItem[]; annual_reports: ReportItem[] }

export function FundamentalAnalysis({ symbol }: FundamentalAnalysisProps) {
  const [reportList, setReportList] = useState<ReportList>({ earnings_calls: [], annual_reports: [] })
  const [activeCategory, setActiveCategory] = useState<Category>("EC")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const company = companyFolder(symbol)

  // Fetch available reports list
  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await safeFetch(`${API}/fundamental/${encodeURIComponent(company)}/list`)
      if (res) {
        const list: ReportList = {
          earnings_calls: res.earnings_calls || [],
          annual_reports: res.annual_reports || [],
        }
        setReportList(list)
        // Default: first earnings call, or fall back to first annual report
        if (list.earnings_calls.length > 0) {
          setActiveCategory("EC")
          setSelectedPeriod(list.earnings_calls[0].period)
        } else if (list.annual_reports.length > 0) {
          setActiveCategory("AR")
          setSelectedPeriod(list.annual_reports[0].period)
        }
      }
      setLoading(false)
    })()
  }, [company])

  // Fetch detail when category or period changes
  useEffect(() => {
    if (!selectedPeriod) return
    ;(async () => {
      setLoading(true)
      const res = await safeFetch(
        `${API}/fundamental/${encodeURIComponent(company)}/${activeCategory}/${encodeURIComponent(selectedPeriod)}`
      )
      setData(res && !res.error ? res : null)
      setLoading(false)
    })()
  }, [selectedPeriod, activeCategory, company])

  const activePeriods = activeCategory === "EC" ? reportList.earnings_calls : reportList.annual_reports

  const handleCategorySwitch = (cat: Category) => {
    setActiveCategory(cat)
    const periods = cat === "EC" ? reportList.earnings_calls : reportList.annual_reports
    if (periods.length > 0) setSelectedPeriod(periods[0].period)
    else setSelectedPeriod("")
  }

  // ─── Loading / empty states ───────────────────────────────────────────────
  if (loading && !data) return (
    <Panel aria-busy="true"><MarketLoader label="the AI analysis" /></Panel>
  )

  const hasAny = reportList.earnings_calls.length > 0 || reportList.annual_reports.length > 0
  if (!hasAny) return (
    <Panel>
      <EmptyState title={`No AI analysis for ${symbol} yet`}>
        Earnings-call and annual-report analysis is available for the companies in the reports library. Technical signals still work for every stock.
      </EmptyState>
    </Panel>
  )

  // ─── Derived data from beginner.json ──────────────────────────────────────
  const sections: Record<string, any> = data?.sections || {}
  const sectionEntries = Object.entries(sections) as [string, any][]
  const avgScore = sectionEntries.length > 0
    ? Math.round(sectionEntries.reduce((sum, [, sec]) => sum + (sec.score ?? 0), 0) / sectionEntries.length)
    : 0
  const categoryLabel = activeCategory === "EC" ? "Earnings call" : "Annual report"
  const pdfUrl = selectedPeriod
    ? `${API}/data/${encodeURIComponent(company)}/${activeCategory}/${encodeURIComponent(selectedPeriod)}/report.pdf`
    : null
  const RING = 2 * Math.PI * 52

  return (
    <div className="space-y-5">
      {/* Document type + period */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Document type">
          {([
            { key: "EC" as Category, label: "Earnings calls", count: reportList.earnings_calls.length },
            { key: "AR" as Category, label: "Annual reports", count: reportList.annual_reports.length },
          ]).filter(t => t.count > 0).map(({ key, label, count }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeCategory === key}
              onClick={() => handleCategorySwitch(key)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm transition-colors",
                activeCategory === key ? "bg-surface-2 font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label} <span className="ml-1 text-faint-foreground">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Period">
          {activePeriods.map(item => (
            <button
              key={item.period}
              onClick={() => setSelectedPeriod(item.period)}
              aria-pressed={selectedPeriod === item.period}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm tabular transition-colors",
                selectedPeriod === item.period
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <Panel><EmptyState title="No analysis for this period">Pick another period above.</EmptyState></Panel>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Overall score */}
          <Panel className="lg:col-span-4" aria-label="Overall score">
            <PanelHeader title={`${categoryLabel}, ${selectedPeriod}`} description={`Average of ${sectionEntries.length} scored dimensions`} />
            <div className="flex items-center gap-5 px-5 py-6">
              <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0 -rotate-90" aria-hidden="true">
                <circle cx="64" cy="64" r="52" fill="none" stroke="var(--surface-2)" strokeWidth="10" />
                <circle cx="64" cy="64" r="52" fill="none" stroke={scoreColor(avgScore)} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(avgScore / 100) * RING} ${RING}`} />
              </svg>
              <div>
                <p className="figure text-5xl leading-none text-foreground">{avgScore}</p>
                <p className="mt-1 text-sm text-muted-foreground">out of 100</p>
                <p className="mt-3 text-sm font-medium" style={{ color: scoreColor(avgScore) }}>
                  {avgScore >= 70 ? "Strong quarter" : avgScore >= 40 ? "Mixed picture" : "Weak signals"}
                </p>
              </div>
            </div>
            {pdfUrl && (
              <div className="border-t border-line px-5 py-3">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <FileText size={15} /> Open the full report (PDF)
                </a>
              </div>
            )}
          </Panel>

          {/* Breakdown */}
          <Panel className="lg:col-span-8" aria-label="Score breakdown">
            <PanelHeader title="What the analysis found" description="Each dimension is scored 0–100 from the document text" />
            <ul className="divide-y divide-line">
              {sectionEntries.map(([key, sec]: [string, any]) => {
                const Icon = SECTION_META[key]?.icon ?? BarChart2
                const color = scoreColor(sec.score)
                return (
                  <li key={key} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium text-foreground">{sec.title}</span>
                      <span className="text-xs" style={{ color }}>{sec.label}</span>
                      <span className="w-8 text-right text-sm font-medium tabular text-foreground">{Math.round(sec.score)}</span>
                    </div>
                    <div className="ml-7 mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${sec.score}%`, backgroundColor: color }} />
                    </div>
                    {sec.bullets?.length > 0 && (
                      <ul className="ml-7 mt-3 space-y-1.5">
                        {sec.bullets.map((b: string, i: number) => (
                          <li key={i} className="text-sm leading-relaxed text-muted-foreground">{b}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  )
}
