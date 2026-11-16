"use client"

import { useEffect, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, ExternalLink, FileText } from "lucide-react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { MarketLoader } from "@/components/ui/market-loader"
import { API_BASE } from "@/lib/api"
import { companyFolder } from "@/lib/company-folders"
import { cn } from "@/lib/utils"

// ── Types: the sparkle.json contract written by sparkle_backend_sr --sparkle ──
interface Metric { name: string; value: number | string | null; unit?: string | null; previous?: number | string | null }
interface Source { label: string; url: string; date?: string | null }
interface Section {
  title: string
  label?: string | null
  score?: number | null
  bullets?: string[]
  metrics?: Metric[]
  sources?: Source[]
}
interface Change { metric: string; previous: number | string | null; current: number | string | null; direction: "up" | "down" | "same"; text: string }
interface SparkleReport {
  company: string
  folder: string
  symbol: string
  as_of: string
  period: { start: string; end: string }
  previous_report: string | null
  summary: { headline: string; points: string[] }
  sections: Record<string, Section>
  section_order?: string[]
  changes?: Change[]
  scores?: Record<string, number | null>
  meta?: { writer?: string; model?: string | null; generated_at?: string }
  pdf_url?: string | null
}
interface ListEntry { date: string; headline: string | null; scores: Record<string, number | null>; has_pdf: boolean }

const DEFAULT_ORDER = ["price_performance", "news_sentiment", "announcements", "valuation", "technicals", "analyst_views", "promise_vs_reality"]

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

// Metrics that are a change or a gap get an explicit sign; levels (yield, 52-week position) don't.
const SIGNED = /return|change|move|vs |versus|upside|against|ahead|gap/i

function fmtValue(v: number | string | null | undefined, unit?: string | null, name = "") {
  if (v == null || v === "") return "—"
  if (typeof v === "string") return v
  const n = Math.abs(v) >= 1000 ? v.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : v.toLocaleString("en-IN", { maximumFractionDigits: 2 })
  // Only changes measured in % or percentage points carry a sign (not ratios like 2.03 x)
  const sign = SIGNED.test(name) && (unit === "%" || unit === "pp") && v > 0 ? "+" : ""
  if (!unit) return `${sign}${n}`
  if (unit === "₹" || unit === "INR") return `₹${n}`
  if (unit === "%") return `${sign}${n}%`
  if (unit.startsWith("/")) return `${n}${unit}`
  return `${sign}${n} ${unit}`
}

function scoreColor(v: number) {
  return v >= 65 ? "var(--up)" : v >= 40 ? "var(--primary)" : "var(--down)"
}

/** Single-series trend of one section score across reports (oldest → newest). */
function Sparkline({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  const w = 120, h = 32, pad = 4
  if (points.length < 2) return null
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1)
  const ys = (v: number) => h - pad - (v / 100) * (h - pad * 2)
  const d = points.map((p, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.value).toFixed(1)}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label} score over the last ${points.length} reports`} className="overflow-visible">
      <line x1={pad} x2={w - pad} y1={ys(50)} y2={ys(50)} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 3" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.date}>
          {/* generous invisible hit target, visible dot only on the latest point */}
          <circle cx={xs(i)} cy={ys(p.value)} r={8} fill="transparent">
            <title>{`${fmtDate(p.date)}: ${Math.round(p.value)}`}</title>
          </circle>
          {i === points.length - 1 && <circle cx={xs(i)} cy={ys(p.value)} r={3.5} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />}
        </g>
      ))}
    </svg>
  )
}

function ChangeIcon({ direction }: { direction: Change["direction"] }) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight
  return <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
}

export function SparkleReportView({ symbol }: { symbol: string }) {
  const company = companyFolder(symbol)
  const [list, setList] = useState<ListEntry[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [report, setReport] = useState<SparkleReport | null>(null)
  const [loading, setLoading] = useState(true)

  // Archive of report dates (also carries scores for the trend lines)
  useEffect(() => {
    let cancelled = false
    setList(null)
    fetch(`${API_BASE}/sparkle/${encodeURIComponent(company)}/list`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled) return
        const reports: ListEntry[] = j?.reports ?? []
        setList(reports)
        setSelected(reports[0]?.date ?? null)
        if (!reports.length) setLoading(false)
      })
      .catch(() => { if (!cancelled) { setList([]); setLoading(false) } })
    return () => { cancelled = true }
  }, [company])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/sparkle/${encodeURIComponent(company)}/${selected}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled) setReport(j && !j.error ? j : null) })
      .catch(() => { if (!cancelled) setReport(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [company, selected])

  if (list === null || (loading && !report)) {
    return <Panel aria-busy="true"><MarketLoader label="the Sparkle Report" /></Panel>
  }

  if (list.length === 0 || !report) {
    return (
      <Panel>
        <EmptyState title={`No Sparkle Report for ${symbol} yet`}>
          Sparkle Reports are written every two weeks from fresh prices, news, BSE announcements, valuation and analyst views, alongside what management said on the last earnings call. They start with the 15 largest Nifty companies.
        </EmptyState>
      </Panel>
    )
  }

  const order = (report.section_order?.length ? report.section_order : DEFAULT_ORDER).filter(k => report.sections[k])
  const pdfUrl = report.pdf_url ? `${API_BASE}${report.pdf_url}` : null
  const history = [...list].reverse() // oldest first for trend lines
  const trend = (key: string) =>
    history.filter(e => typeof e.scores?.[key] === "number").map(e => ({ date: e.date, value: e.scores[key] as number }))
  const writtenBy = report.meta?.writer === "gemini" ? "Written by AI from the data below; every number is checked against it." : "Generated directly from the data below."

  return (
    <div className="space-y-6">
      {/* Headline */}
      <Panel aria-label="Sparkle Report summary">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              Sparkle Report, {fmtDate(report.as_of)}
              <span className="ml-2 text-faint-foreground">covers {fmtDate(report.period.start)} to {fmtDate(report.period.end)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {list.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="sr-only">Report date</span>
                <select
                  value={selected ?? ""}
                  onChange={e => setSelected(e.target.value)}
                  className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-foreground focus:border-primary/60 focus:outline-none"
                >
                  {list.map((e, i) => <option key={e.date} value={e.date}>{fmtDate(e.date)}{i === 0 ? " (latest)" : ""}</option>)}
                </select>
              </label>
            )}
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-muted-foreground hover:border-line-strong hover:text-foreground">
                <FileText size={14} /> PDF
              </a>
            )}
          </div>
        </div>
        <div className="px-5 py-5">
          <h2 className="max-w-3xl text-xl font-semibold leading-snug text-foreground">{report.summary.headline}</h2>
          {report.summary.points?.length > 0 && (
            <ul className="mt-4 max-w-3xl space-y-2">
              {report.summary.points.map((p, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-faint-foreground">{writtenBy} Not investment advice.</p>
        </div>
      </Panel>

      {/* Since the last report */}
      <Panel aria-label="Changes since the previous report">
        <PanelHeader
          title="Since our last report"
          description={report.previous_report ? `Compared with the report from ${fmtDate(report.previous_report)}` : undefined}
        />
        {!report.previous_report ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">This is the first Sparkle Report for {symbol}, so there is nothing to compare yet. The next one will show what changed.</p>
        ) : !report.changes?.length ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Nothing material changed since the last report.</p>
        ) : (
          <ul className="divide-y divide-line">
            {report.changes.map((c, i) => (
              <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                <ChangeIcon direction={c.direction} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">{c.text}</p>
                  {(c.previous != null || c.current != null) && (
                    <p className="mt-0.5 text-xs tabular text-faint-foreground">{c.metric}: {fmtValue(c.previous)} to {fmtValue(c.current)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Sections */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {order.map(key => {
          const sec = report.sections[key]
          const points = trend(key)
          return (
            <Panel key={key} aria-label={sec.title} className={cn(key === "promise_vs_reality" && "lg:col-span-2")}>
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{sec.title}</h3>
                  {sec.label && <p className="mt-0.5 text-xs" style={{ color: typeof sec.score === "number" ? scoreColor(sec.score) : "var(--muted-foreground)" }}>{sec.label}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Sparkline points={points} label={sec.title} />
                  {typeof sec.score === "number" && (
                    <span className="w-8 text-right text-lg font-semibold tabular text-foreground" title="Section score, 0–100">{Math.round(sec.score)}</span>
                  )}
                </div>
              </div>

              {sec.metrics && sec.metrics.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-line px-5 py-3 text-sm sm:grid-cols-3">
                  {sec.metrics.map(m => (
                    <div key={m.name} className="min-w-0">
                      <dt className="text-xs leading-snug text-muted-foreground">{m.name}</dt>
                      <dd className="tabular text-foreground">
                        {fmtValue(m.value, m.unit, m.name)}
                        {m.previous != null && <span className="ml-1.5 text-xs text-faint-foreground">was {fmtValue(m.previous, m.unit, m.name)}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {sec.bullets && sec.bullets.length > 0 && (
                <ul className="space-y-1.5 px-5 py-3">
                  {sec.bullets.map((b, i) => <li key={i} className="text-sm leading-relaxed text-muted-foreground">{b}</li>)}
                </ul>
              )}

              {sec.sources && sec.sources.length > 0 && (
                <details className="group border-t border-line">
                  <summary className="cursor-pointer list-none px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                    Sources <span className="text-faint-foreground">{sec.sources.length}</span>
                  </summary>
                  <ul className="space-y-1.5 px-5 pb-3">
                    {sec.sources.map((s, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-xs">
                        {s.date && <span className="w-20 shrink-0 tabular text-faint-foreground">{fmtDate(s.date)}</span>}
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 text-muted-foreground hover:text-primary">
                          <span className="truncate">{s.label}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
