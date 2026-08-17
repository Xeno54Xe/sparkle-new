"use client"

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import type { ValidationIssue } from "../domain/types"

type DataQualityWarningProps = {
  issues: ValidationIssue[]
}

const manualCodes = new Set(["manual-mode", "missing-quote-timestamp", "missing-liquidity"])

export function DataQualityWarning({ issues }: DataQualityWarningProps) {
  const blocking = issues.filter((issue) => issue.severity === "error")
  const visibleWarnings = issues
    .filter((issue) => issue.severity === "warning" && !manualCodes.has(issue.code))
    .slice(0, 5)
  const manualNoticeCount = issues.filter((issue) => manualCodes.has(issue.code)).length
  const infoCount = issues.filter((issue) => issue.severity === "info").length

  if (issues.length === 0) return null

  return (
    <div className="space-y-2" aria-live="polite">
      {blocking.map((issue) => (
        <div key={issue.code} className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </div>
      ))}

      {visibleWarnings.map((issue) => (
        <div key={issue.code} className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </div>
      ))}

      {manualNoticeCount > 0 && blocking.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Model mode is active: the calculator uses automated, editable strikes and estimated premiums. Live bid/ask, OI, exchange IV and Greeks can be connected later.
          </span>
        </div>
      )}

      {infoCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Educational analysis only. No trades are placed from this screen.</span>
        </div>
      )}
    </div>
  )
}
