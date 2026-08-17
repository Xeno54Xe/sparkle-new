"use client"

import { Brain, CheckCircle2, Layers3, Sparkles } from "lucide-react"
import type { RiskPreference, StrategyCandidate, StrategyGoal } from "../domain/types"

type GuidedStrategyFinderProps = {
  symbol: string
  change: number
  risk: RiskPreference
  goal: StrategyGoal
  candidates: StrategyCandidate[]
  loadingSignal: boolean
  onRiskChange: (risk: RiskPreference) => void
  onGoalChange: (goal: StrategyGoal) => void
  onSelectCandidate: (candidate: StrategyCandidate) => void
}

const riskOptions: Array<{ value: RiskPreference; label: string; hint: string }> = [
  { value: "lower-risk", label: "Safer path", hint: "Prefer capped risk and calmer payoffs" },
  { value: "balanced", label: "Balanced", hint: "Mix spreads and directional ideas" },
  { value: "high-risk", label: "High risk / reward", hint: "Accept premium risk for bigger upside" },
]

const goalOptions: Array<{ value: StrategyGoal; label: string }> = [
  { value: "not-sure", label: "Not sure" },
  { value: "upside", label: "Stock may rise" },
  { value: "downside", label: "Stock may fall" },
  { value: "range-bound", label: "May stay in range" },
  { value: "big-move", label: "Big move either way" },
]

export function GuidedStrategyFinder({
  symbol,
  change,
  risk,
  goal,
  candidates,
  loadingSignal,
  onRiskChange,
  onGoalChange,
  onSelectCandidate,
}: GuidedStrategyFinderProps) {
  return (
    <section className="rounded-xl border border-primary/20 bg-card p-5 shadow-[0_0_40px_rgba(16,185,129,0.06)]" aria-label="Guided strategy finder">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Strategy recommender for {symbol}</h2>
              <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-muted-foreground">model engine</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Choose a market view and risk comfort. The app ranks suitable structures and fills editable demo legs for the calculator.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          Today: <span className={change >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">What do you want?</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {goalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onGoalChange(option.value)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  goal === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Risk comfort</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {riskOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onRiskChange(option.value)}
                className={`min-h-16 rounded-lg border px-3 py-2 text-left transition-colors ${
                  risk === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs opacity-80">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {candidates.map((candidate, index) => (
          <article
            key={candidate.strategyId}
            className={`flex flex-col rounded-xl border bg-background p-4 transition-colors ${
              index === 0 ? "border-primary/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "border-border"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {index === 0 && <Sparkles size={14} className="text-primary" />}
                  <h3 className="font-semibold text-foreground">{candidate.label}</h3>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{candidate.fit}</p>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{candidate.score}/100 fit</span>
            </div>

            <p className="text-sm font-medium text-foreground">{candidate.riskReward}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {candidate.why.slice(0, 3).map((reason) => (
                <li key={reason} className="flex gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <Layers3 size={14} className="text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-priced setup</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {candidate.setupGuide.join(" ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectCandidate(candidate)}
              className="mt-4 min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Load model setup
            </button>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        {loadingSignal
          ? "Reading the latest available technical signal..."
          : "Live option-chain automation is intentionally hidden until data access is available. These recommendations use the stock move, technical score, estimated volatility and selected risk profile."}
      </div>
    </section>
  )
}
