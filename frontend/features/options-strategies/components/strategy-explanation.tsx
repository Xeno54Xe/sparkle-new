"use client"

import { BadgeCheck, Lock, TrendingUp } from "lucide-react"
import type { StrategyDefinition } from "../domain/types"

type StrategyExplanationProps = {
  definition: StrategyDefinition
}

export function StrategyExplanation({ definition }: StrategyExplanationProps) {
  const traits = [
    { label: "Outlook", value: definition.outlook, icon: TrendingUp },
    { label: "Premium", value: definition.premiumProfile, icon: BadgeCheck },
    { label: "Risk", value: definition.lossCapped ? "Defined" : "Open-ended", icon: Lock },
  ]

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-label="Strategy explanation">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {definition.legTemplates.length} leg{definition.legTemplates.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold capitalize text-muted-foreground">
              {definition.premiumProfile}
            </span>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-muted-foreground">
              {definition.outlook}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{definition.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{definition.description}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{definition.cappedExplanation}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {traits.map((trait) => {
            const Icon = trait.icon
            return (
              <div key={trait.label} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-primary">
                  <Icon size={15} />
                  <p className="text-xs font-semibold uppercase tracking-wide">{trait.label}</p>
                </div>
                <p className="mt-2 text-sm font-semibold capitalize text-foreground">{trait.value}</p>
              </div>
            )
          })}
        </div>
      </div>
      <p className="sr-only">
        {definition.name} uses {definition.legTemplates.length} option legs. Profit capped: {definition.profitCapped ? "yes" : "no"}. Loss capped: {definition.lossCapped ? "yes" : "no"}.
      </p>
    </section>
  )
}
