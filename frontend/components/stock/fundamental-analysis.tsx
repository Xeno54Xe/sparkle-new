"use client"

import { useState, useEffect } from "react"
import {
  Target, Brain, Leaf, Users, FileText, AlertTriangle,
  TrendingUp, CheckCircle, Lightbulb, ChevronDown, ChevronUp,
  Shield, Eye, MessageSquare, Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FundamentalAnalysisProps {
  symbol: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}"

// Auto-generate description text based on metric heading, value, and label
function generateMetricPhrase(heading: string, value: number, label: string, symbol: string): string {
  const s = symbol
  const v = value
  const tier = v >= 80 ? "exceptional" : v >= 60 ? "strong" : v >= 40 ? "moderate" : v >= 20 ? "below average" : "weak"

  const phrases: Record<string, () => string> = {
    "Overall Mood": () => v >= 70
      ? `${s} management conveys a ${tier} level of confidence, scoring ${v}/100 on overall sentiment.`
      : `${s} management tone is ${tier}, with an overall mood score of ${v}/100.`,
    "Company Outlook": () => v >= 60
      ? `Forward-looking statements suggest a ${tier} outlook, rated ${v}/100.`
      : `The company's forward guidance appears ${tier}, scoring only ${v}/100.`,
    "Sustainability": () => v >= 60
      ? `${s} demonstrates ${tier} commitment to sustainable practices (${v}/100).`
      : `Sustainability efforts appear ${tier} at ${v}/100 — room for improvement.`,
    "Environmental": () => v >= 60
      ? `Environmental initiatives are ${tier}, with green projects scoring ${v}/100.`
      : `Environmental score of ${v}/100 suggests limited green initiatives discussed.`,
    "People & Society": () => v >= 60
      ? `Social responsibility and employee relations are ${tier} at ${v}/100.`
      : `Social and people metrics are ${tier}, scoring ${v}/100.`,
    "Corporate Governance": () => v >= 60
      ? `Governance practices are ${tier} with transparent leadership (${v}/100).`
      : `Corporate governance scored ${v}/100, indicating ${tier} transparency.`,
    "Management Honesty": () => v >= 60
      ? `Management appears transparent and forthcoming in their disclosures (${v}/100).`
      : `Honesty and transparency in management communication scored ${v}/100.`,
    "Financial Health": () => v >= 70
      ? `The company's balance sheet and profitability metrics are ${tier} (${v}/100).`
      : `Financial health indicators are ${tier} at ${v}/100 — warrants closer review.`,
    "Growth Plans": () => v >= 60
      ? `${s} has articulated ${tier} growth strategies and expansion plans (${v}/100).`
      : `Growth plans appear ${tier}, scoring ${v}/100 on ambition and clarity.`,
    "Risk Level": () => v >= 60
      ? `Risk management is ${tier} — the company appears well-positioned to handle headwinds (${v}/100).`
      : `Risk score of ${v}/100 suggests elevated concerns that need monitoring.`,
    "Investor Confidence": () => v >= 60
      ? `Investors show ${tier} confidence in ${s}'s direction and financial reporting (${v}/100).`
      : `Investor confidence is ${tier} at ${v}/100, reflecting cautious market sentiment.`,
  }

  return (phrases[heading] || (() => `${heading} scored ${v}/100, rated as "${label}".`))()
}

// Stock symbol → company folder name
const MAP: Record<string, string> = {
  ADANIENT:"Adani", ADANIPORTS:"Adani_Ports_and_SEZ", APOLLOHOSP:"Apollo_Hospitals",
  ASIANPAINT:"Asian_Paints", AXISBANK:"Axis", BPCL:"BPCL", "BAJAJ-AUTO":"Bajaj_Auto",
  BAJFINANCE:"Bajaj_Finance", BAJAJFINSV:"Bajaj_Finserv", BHARTIARTL:"Bharti_Airtel",
  BRITANNIA:"Britannia_Industries", CIPLA:"Cipla", COALINDIA:"Coal_India",
  DIVISLAB:"Divi's_Laboratories", DRREDDY:"Dr._Reddy's_Laboratories", EICHERMOT:"Eicher_Motors",
  GRASIM:"Grasim_Industries", HCLTECH:"HCL_Tech", HDFCBANK:"HDFC", HDFCLIFE:"HDFC_Life",
  HINDUNILVR:"HUL", HEROMOTOCO:"Hero_MotoCorp", HINDALCO:"Hindalco_Industries",
  ICICIBANK:"ICICI", INDUSINDBK:"IndusInd_Bank", INFY:"Infosys", JSWSTEEL:"JSW_Steel",
  KOTAKBANK:"Kotak_Mahindra_Bank", LT:"L&T", LTIM:"LTIMindtree", "M&M":"M&M",
  MARUTI:"Maruti_Suzuki_India", NESTLEIND:"Nestle_India", NTPC:"NTPC", ONGC:"ONGC",
  POWERGRID:"Powergrid_Corporation", RELIANCE:"Reliance", SBIN:"SBI",
  SBILIFE:"SBI_Life_Insurance", SUNPHARMA:"Sun_Pharma", TCS:"TCS",
  TATACONSUM:"Tata_Consumer_Products", TATAMOTORS:"Tata_Motors", TATASTEEL:"Tata_Steel",
  TECHM:"Tech_Mahindra", TITAN:"Titan_Company", UPL:"UPL_Ltd", ULTRACEMCO:"Ultratech_Cement",
  WIPRO:"Wipro",
}

async function safeFetch(url: string) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const t = await r.text()
    try { return JSON.parse(t) } catch { return null }
  } catch { return null }
}

export function FundamentalAnalysis({ symbol }: FundamentalAnalysisProps) {
  const [quarters, setQuarters] = useState<any[]>([])
  const [selectedQ, setSelectedQ] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [expandedSpeaker, setExpandedSpeaker] = useState<number | null>(null)

  const company = MAP[symbol] || symbol

  // Fetch available quarters
  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await safeFetch(`${API}/fundamental/${encodeURIComponent(company.replace(/_/g, " "))}`)
      if (res?.analyses?.length > 0) {
        setQuarters(res.analyses)
        const latest = res.analyses[0]
        const qfy = `${latest.quarter}_${latest.fiscal_year}`
        setSelectedQ(qfy)
      }
      setLoading(false)
    })()
  }, [company])

  // Fetch quarter detail
  useEffect(() => {
    if (!selectedQ) return
    ;(async () => {
      setLoading(true)
      const res = await safeFetch(`${API}/fundamental/${encodeURIComponent(company.replace(/_/g, " "))}/${selectedQ}`)
      if (res && !res.error) setData(res)
      else setData(null)
      setLoading(false)
    })()
  }, [selectedQ, company])

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 size={20} className="animate-spin" /> Loading analysis...
    </div>
  )
  if (!data) return (
    <div className="text-center py-20 text-muted-foreground">No fundamental data available for {symbol}</div>
  )

  const headline = data.headline || {}
  const sentiment = data.sentiment || {}
  const esg = data.esg || {}
  const speakers = data.speaker?.speakers || []
  const summary = data.summary || {}
  const metrics = data.metrics?.metrics || []
  const sentimentPct = Math.round((headline.overall_sentiment_score || 0) * 100)

  return (
    <div className="space-y-6">

      {/* Quarter Selector */}
      <div className="flex flex-wrap gap-2">
        {quarters
          .filter((q: any) => q.quarter && q.fiscal_year)
          .filter((q: any, i: number, arr: any[]) => {
            const qfy = `${q.quarter}_${q.fiscal_year}`
            return arr.findIndex((x: any) => `${x.quarter}_${x.fiscal_year}` === qfy) === i
          })
          .map((q: any) => {
            const qfy = `${q.quarter}_${q.fiscal_year}`
            return (
              <button key={qfy} onClick={() => setSelectedQ(qfy)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectedQ === qfy ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {q.quarter} {q.fiscal_year}
              </button>
            )
          })}
      </div>

      {/* ═══ HEADLINE VERDICT ═══ */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-[3px] text-muted-foreground mb-6">HEADLINE VERDICT</p>
            <div className="relative h-40 w-40 mb-4">
              <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="64" fill="none" stroke="currentColor" strokeWidth="12" className="text-secondary" />
                <circle cx="80" cy="80" r="64" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(sentimentPct / 100) * 402.1} 402.1`} />
                <defs><linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#34D399" /><stop offset="100%" stopColor="#06B6D4" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{sentimentPct}%</span>
                <span className="text-xs text-muted-foreground">{headline.overall_sentiment_label || "N/A"}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
              style={{ backgroundColor: (headline.overall_sentiment_colour || "#34D399") + "20", color: headline.overall_sentiment_colour || "#34D399" }}>
              <Target size={16} />{headline.investment_signal || "N/A"}
            </div>
            <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
              <span>Sentiment: <span className="font-semibold text-foreground">{headline.overall_sentiment_label}</span></span>
              <span className="h-3 w-px bg-border" />
              <span>ESG: <span className="font-semibold text-foreground">{headline.esg_score}/100</span></span>
              <span className="h-3 w-px bg-border" />
              <span>Q&A: <span className="font-semibold text-foreground">{headline.qa_transparency_score}/10</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ NEW METRICS (11 scores) ═══ */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp size={20} className="text-primary" /> SparkleAI Metrics</CardTitle>
            <p className="text-xs text-muted-foreground">11 key dimensions scored 0-100</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metrics.map((m: any, i: number) => {
                const color = m.value >= 70 ? "#34D399" : m.value >= 40 ? "#FBBF24" : "#F87171"
                const autoPhrase = generateMetricPhrase(m.heading, m.value, m.label, symbol)
                return (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">{m.heading}</span>
                      <span className="text-xs font-bold" style={{ color }}>{m.label}</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{m.value}</div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
                      <div className="h-full rounded-full" style={{ width: `${m.value}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.phrase || autoPhrase}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ EARNINGS CALL SENTIMENT ═══ */}
      {sentiment.dimensions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Brain size={20} className="text-primary" /> Earnings Call Sentiment</CardTitle>
            <p className="text-xs text-muted-foreground">FinBERT-scored across 4 financial dimensions</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(sentiment.dimensions).map(([key, dim]: [string, any]) => {
              const pct = Math.round((dim.score || 0) * 100)
              const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-semibold" style={{ color: dim.colour }}>{dim.label} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dim.colour }} />
                  </div>
                </div>
              )
            })}
            <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="flex items-center gap-2 mb-3"><CheckCircle size={14} className="text-primary" /><span className="text-sm font-semibold text-primary">Positive Drivers</span></div>
                <ul className="space-y-2">{(sentiment.key_positive_drivers || []).map((d: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><TrendingUp size={12} className="mt-1 shrink-0 text-primary" />{d}</li>
                ))}</ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-destructive" /><span className="text-sm font-semibold text-destructive">Risk Factors</span></div>
                <ul className="space-y-2">{(sentiment.key_negative_drivers || []).map((d: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle size={12} className="mt-1 shrink-0 text-destructive" />{d}</li>
                ))}</ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ESG INTELLIGENCE ═══ */}
      {esg.overall_esg_score && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Leaf size={20} className="text-primary" /> ESG Intelligence</CardTitle>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: (esg.esg_colour || "#2E7D32") + "20", color: esg.esg_colour || "#2E7D32" }}>
                {esg.esg_label} — {esg.overall_esg_score}/100
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Environmental", data: esg.environmental, color: "#10B981", icon: Leaf },
              { label: "Social", data: esg.social, color: "#3B82F6", icon: Users },
              { label: "Governance", data: esg.governance, color: "#8B5CF6", icon: Shield },
            ].map(pillar => pillar.data && (
              <div key={pillar.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><pillar.icon size={14} style={{ color: pillar.color }} /><span className="text-sm font-medium">{pillar.label}</span></div>
                  <span className="text-sm font-bold">{pillar.data.score}/100</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pillar.data.score}%`, backgroundColor: pillar.color }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(pillar.data.key_themes || []).map((t: string) => (
                    <span key={t} className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: pillar.color + "15", color: pillar.color }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
            {(esg.strengths || esg.weaknesses || esg.red_flags) && (
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="rounded-lg bg-primary/5 p-3"><p className="text-xs font-semibold text-primary mb-2">Strengths</p>{(esg.strengths || []).map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {s}</p>)}</div>
                <div className="rounded-lg bg-[#FBBF24]/5 p-3"><p className="text-xs font-semibold text-[#FBBF24] mb-2">Weaknesses</p>{(esg.weaknesses || []).map((w: string, i: number) => <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {w}</p>)}</div>
                <div className="rounded-lg bg-destructive/5 p-3"><p className="text-xs font-semibold text-destructive mb-2">Red Flags</p>{(esg.red_flags || []).map((r: string, i: number) => <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {r}</p>)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ SPEAKER ANALYSIS ═══ */}
      {speakers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare size={20} /> Speaker Analysis</CardTitle>
            <p className="text-xs text-muted-foreground">{speakers.length} speakers analyzed via FinBERT</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {speakers.map((sp: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: (sp.sentiment_colour || "#34D399") + "20", color: sp.sentiment_colour || "#34D399" }}>
                      {sp.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div><p className="text-sm font-semibold">{sp.name}</p><p className="text-xs text-muted-foreground">{sp.role}</p></div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: (sp.sentiment_colour || "#34D399") + "20", color: sp.sentiment_colour }}>
                    {sp.sentiment_label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>Tone: <span className="text-foreground font-medium capitalize">{sp.tone}</span></span>
                  <span>Score: <span className="text-foreground font-medium">{Math.round((sp.sentiment_score || 0) * 100)}%</span></span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(sp.key_topics || []).map((t: string) => <span key={t} className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{t}</span>)}
                </div>
                {sp.dodged_or_vague?.length > 0 && (
                  <>
                    <button onClick={() => setExpandedSpeaker(expandedSpeaker === idx ? null : idx)} className="flex items-center gap-1.5 mt-2 text-xs font-medium text-destructive">
                      <AlertTriangle size={12} /> Dodged/Vague ({sp.dodged_or_vague.length})
                      {expandedSpeaker === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedSpeaker === idx && (
                      <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                        {sp.dodged_or_vague.map((d: string, i: number) => <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {d}</p>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      {summary.executive_summary && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><FileText size={20} /> Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {showFullSummary ? summary.executive_summary : (summary.executive_summary || "").slice(0, 300) + "..."}
            </p>
            <button onClick={() => setShowFullSummary(!showFullSummary)} className="mt-2 text-sm font-medium text-primary hover:underline">
              {showFullSummary ? "Show less" : "Read full summary..."}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ═══ RISKS & OPPORTUNITIES ═══ */}
      <div className="grid gap-6 md:grid-cols-2">
        {summary.key_risks?.risks && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-destructive"><AlertTriangle size={20} /> Key Risks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {summary.key_risks.risks.map((r: any, i: number) => {
                const sc = r.severity === "high" ? "#EF4444" : r.severity === "medium" ? "#FBBF24" : "#10B981"
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sc }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.risk}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-xs font-medium uppercase" style={{ backgroundColor: sc + "15", color: sc }}>{r.severity}</span>
                        <span className="text-xs text-muted-foreground">{r.type}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
        {summary.key_opportunities?.opportunities && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-primary"><TrendingUp size={20} /> Key Opportunities</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {summary.key_opportunities.opportunities.map((o: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.opportunity}</p>
                    <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{o.timeframe}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ INVESTMENT THESIS ═══ */}
      {summary.investment_thesis_rationale && (
        <Card className="border-[#6366F1]/30 bg-gradient-to-r from-[#6366F1]/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb size={20} className="text-[#6366F1]" /> Investment Thesis
              <span className="ml-2 rounded-full bg-[#6366F1]/10 px-3 py-1 text-xs font-semibold text-[#6366F1]">{summary.investment_thesis_signal}</span>
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{summary.investment_thesis_rationale}</p></CardContent>
        </Card>
      )}

      {/* ═══ Q&A TRANSPARENCY ═══ */}
      {summary.qa_quality && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye size={20} /> Q&A Transparency
              <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{summary.qa_quality.overall_transparency_score}/10</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.qa_quality.direct_answer_examples?.length > 0 && (
              <div><p className="text-xs font-semibold text-primary mb-2">Direct Answers</p>
                {summary.qa_quality.direct_answer_examples.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5"><CheckCircle size={12} className="mt-0.5 shrink-0 text-primary" /><span className="text-sm text-muted-foreground">{d}</span></div>
                ))}
              </div>
            )}
            {summary.qa_quality.dodged_questions?.length > 0 && (
              <div className="border-t border-border pt-4"><p className="text-xs font-semibold text-destructive mb-2">Dodged Questions</p>
                {summary.qa_quality.dodged_questions.map((dq: any, i: number) => (
                  <div key={i} className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Q: {dq.question}</p>
                    <p className="text-xs text-muted-foreground italic mb-1">&ldquo;{dq.management_response}&rdquo;</p>
                    <p className="text-xs text-destructive">{dq.assessment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ VIEW FULL REPORT ═══ */}
      {data.report_markdown && (
        <>
          <button onClick={() => setShowReport(!showReport)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <FileText size={18} />{showReport ? "Hide Full Report" : "View Full AI Research Report"}
          </button>
          {showReport && (
            <Card><CardContent className="pt-6"><pre className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">{data.report_markdown}</pre></CardContent></Card>
          )}
        </>
      )}
    </div>
  )
}
