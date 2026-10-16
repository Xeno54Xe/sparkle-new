"use client"

import { useState, useEffect, useMemo } from "react"
import { Download, ExternalLink, Search } from "lucide-react"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

const API = API_BASE

interface Report {
  company_name: string
  category: "EC" | "AR"
  period: string
  pdf_url: string
}

const CATEGORY_LABEL: Record<string, string> = { EC: "Earnings call", AR: "Annual report" }
const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "EC", label: "Earnings calls" },
  { id: "AR", label: "Annual reports" },
] as const

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "EC" | "AR">("ALL")
  const [query, setQuery] = useState("")

  useEffect(() => {
    document.title = "Reports — SparkleAI"
    fetch(`${API}/reports/list`)
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [])

  // One row per company, newest documents first
  const companies = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byCompany = new Map<string, Report[]>()
    reports
      .filter(r => filter === "ALL" || r.category === filter)
      .filter(r => !q || r.company_name.toLowerCase().includes(q))
      .forEach(r => { byCompany.set(r.company_name, [...(byCompany.get(r.company_name) || []), r]) })
    return Array.from(byCompany.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [reports, filter, query])

  const visibleCount = companies.reduce((n, [, list]) => n + list.length, 0)

  return (
    <DashboardShell>
      <PageHeader
        title="Reports"
        description={loading ? "AI-written summaries of earnings calls and annual reports." : `${visibleCount} AI-written summaries of earnings calls and annual reports, as PDFs.`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Company name"
            aria-label="Filter by company"
            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-faint-foreground focus:border-primary/60 focus:outline-none"
          />
        </div>
        <div className="flex w-fit rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Document type">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn("rounded px-3 py-1.5 text-sm", filter === f.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Panel aria-busy="true"><div className="space-y-2 p-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded bg-surface-2" />)}</div></Panel>
      ) : companies.length === 0 ? (
        <Panel>
          <EmptyState
            title={reports.length === 0 ? "No reports available" : "No reports match"}
            action={reports.length > 0 ? <button onClick={() => { setFilter("ALL"); setQuery("") }} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          >
            {reports.length === 0 ? "The backend hasn't returned any processed documents. Check that it's running on port 8000." : "Try another company name or document type."}
          </EmptyState>
        </Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-line">
            {companies.map(([company, list]) => (
              <li key={company} className="flex flex-col gap-2 px-5 py-3.5 md:flex-row md:items-center md:gap-6">
                <span className="text-sm font-medium text-foreground md:w-64 md:shrink-0">{company}</span>
                <div className="flex flex-wrap gap-1.5">
                  {list.map(r => {
                    const url = `${API}${r.pdf_url}`
                    return (
                      <span key={r.category + r.period} className="inline-flex items-stretch overflow-hidden rounded-md border border-line text-xs">
                        <a href={url} target="_blank" rel="noopener noreferrer" title={`Open ${CATEGORY_LABEL[r.category]} ${r.period}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                          <span className={r.category === "AR" ? "text-primary" : "text-info"}>{r.category === "AR" ? "Annual" : "Call"}</span>
                          <span className="tabular text-foreground">{r.period}</span>
                          <ExternalLink size={11} className="text-faint-foreground" />
                        </a>
                        <a href={url} download={`${company} - ${r.category} ${r.period}.pdf`} aria-label={`Download ${CATEGORY_LABEL[r.category]} ${r.period}`}
                          className="flex items-center border-l border-line px-2 text-faint-foreground hover:bg-surface-2 hover:text-foreground">
                          <Download size={12} />
                        </a>
                      </span>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </DashboardShell>
  )
}
