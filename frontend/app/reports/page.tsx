"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FileText, Download, Eye, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Report {
  company_name: string
  category: "EC" | "AR"
  period: string
  pdf_url: string
}

const CATEGORY_LABEL: Record<string, string> = { EC: "Earnings Call", AR: "Annual Report" }

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "EC" | "AR">("ALL")

  useEffect(() => {
    fetch(`${API}/reports/list`)
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === "ALL" ? reports : reports.filter(r => r.category === filter)

  return (
    <DashboardShell noTopBar>
        <main className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <FileText size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">AI Research Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading…" : `${visible.length} report${visible.length !== 1 ? "s" : ""} available`}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg bg-secondary p-1 w-fit mb-6">
            {(["ALL", "EC", "AR"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "ALL" ? "All" : f === "EC" ? "Earnings Calls" : "Annual Reports"}
              </button>
            ))}
          </div>

          {/* Report list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 size={28} className="animate-spin text-primary/50" />
              <p className="text-sm">Loading reports…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-white/5 mb-4">
                <FileText size={28} className="text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No reports found</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {filter === "ALL"
                  ? "No research reports are available yet. Check back after the backend has processed documents."
                  : `No ${filter === "EC" ? "Earnings Call" : "Annual Report"} reports match your filter. Try switching to "All".`}
              </p>
              {filter !== "ALL" && (
                <button
                  onClick={() => setFilter("ALL")}
                  className="mt-4 text-sm text-primary hover:underline font-medium"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((r, i) => {
                const fullUrl = `${API}${r.pdf_url}`
                const filename = `${r.company_name} - ${r.category} ${r.period}.pdf`
                return (
                  <div key={i} className="glass-card glass-card-hover rounded-2xl p-5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 border border-white/5 shadow-inner">
                          <FileText size={22} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {r.company_name}
                            <span className="text-muted-foreground font-medium"> — {r.period}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {CATEGORY_LABEL[r.category] ?? r.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-secondary/50 border border-white/5 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                        >
                          <Eye size={16} /> View
                        </a>
                        <a
                          href={fullUrl}
                          download={filename}
                          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-colors hover:bg-primary/90 hover:scale-[1.02]"
                        >
                          <Download size={16} /> PDF
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
    </DashboardShell>
  )
}
