"use client"

import type { StrategyMetrics } from "../domain/types"

function formatCurrency(value: number | null) {
  if (value === null) return "Theoretically unlimited"
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

type MetricTone = "good" | "bad" | "warn" | "neutral"

type StrategyMetricsProps = {
  metrics: StrategyMetrics | null
  blocked: boolean
  rewardToRisk: number | null
  capitalAtRisk: number | null
}

function toneClass(tone: MetricTone) {
  if (tone === "good") return "text-primary"
  if (tone === "bad") return "text-destructive"
  if (tone === "warn") return "text-amber-300"
  return "text-foreground"
}

export function StrategyMetricsCards({ metrics, blocked, rewardToRisk, capitalAtRisk }: StrategyMetricsProps) {
  const items: Array<{ label: string; value: string; tone: MetricTone }> = blocked || !metrics
    ? [
        { label: "Net Premium", value: "Complete valid inputs", tone: "neutral" },
        { label: "Max Profit", value: "Unavailable", tone: "neutral" },
        { label: "Max Loss", value: "Unavailable", tone: "neutral" },
        { label: "Breakeven", value: "Unavailable", tone: "neutral" },
        { label: "Capital At Risk", value: "Unavailable", tone: "neutral" },
        { label: "Reward / Risk", value: "Unavailable", tone: "neutral" },
      ]
    : [
        {
          label: "Net Premium",
          value: `${metrics.netPremium >= 0 ? "Credit" : "Debit"} ${formatCurrency(Math.abs(metrics.netPremium))}`,
          tone: metrics.netPremium >= 0 ? "good" : "warn",
        },
        { label: "Max Profit", value: formatCurrency(metrics.maxProfit), tone: "good" },
        { label: "Max Loss", value: formatCurrency(metrics.maxLoss), tone: "bad" },
        {
          label: "Breakeven",
          value: metrics.breakevens.length
            ? metrics.breakevens.map((value) => `Rs ${value.toFixed(2)}`).join(", ")
            : "None in range",
          tone: "neutral",
        },
        {
          label: "Capital At Risk",
          value: capitalAtRisk == null ? "Unavailable" : formatCurrency(capitalAtRisk),
          tone: "warn",
        },
        {
          label: "Reward / Risk",
          value: rewardToRisk == null ? "Open-ended" : `${rewardToRisk.toFixed(2)}x`,
          tone: "good",
        },
      ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className={`mt-2 text-base font-semibold ${toneClass(item.tone)}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}
