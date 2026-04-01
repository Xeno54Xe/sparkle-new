"use client"
import { Sidebar } from "@/components/dashboard/sidebar"
import { FileText, Download, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const reports = [
  { company: "Reliance Industries", quarter: "Q3 FY26", date: "Mar 17, 2026", pages: 12, signal: "Cautiously Bullish" },
  { company: "Reliance Industries", quarter: "Q2 FY26", date: "Mar 17, 2026", pages: 11, signal: "Cautiously Bullish" },
  { company: "Adani Enterprises", quarter: "Q3 FY26", date: "Mar 17, 2026", pages: 10, signal: "Cautiously Bullish" },
  { company: "HDFC Bank", quarter: "Q3 FY26", date: "Mar 19, 2026", pages: 9, signal: "Neutral" },
  { company: "ICICI Bank", quarter: "Q2 FY26", date: "Mar 19, 2026", pages: 11, signal: "Bullish" },
  { company: "Bajaj Finance", quarter: "Q1 FY26", date: "Mar 19, 2026", pages: 8, signal: "Cautiously Bullish" },
]

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px]">
        <main className="flex-1 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <FileText size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">AI Research Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">Generated earnings call analysis and market reports</p>
            </div>
          </div>
          <div className="space-y-4">
            {reports.map((r, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 border border-white/5 shadow-inner">
                      <FileText size={22} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">{r.company} <span className="text-muted-foreground font-medium">— {r.quarter}</span></p>
                      <p className="text-sm text-muted-foreground mt-0.5">{r.date} · {r.pages} pages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] px-4 py-1.5 text-xs font-bold text-primary tracking-wide">
                      {r.signal}
                    </span>
                    <button className="flex items-center gap-2 rounded-xl bg-secondary/50 border border-white/5 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
                      <Eye size={16} /> View
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-colors hover:bg-primary/90 hover:scale-[1.02]">
                      <Download size={16} /> PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
