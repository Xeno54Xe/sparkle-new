"use client"

import type { StrategyId } from "../domain/types"
import { STRATEGY_DEFINITIONS, STRATEGY_IDS } from "../domain/strategy-definitions"

type StrategySelectorProps = {
  value: StrategyId
  onChange: (value: StrategyId) => void
}

export function StrategySelector({ value, onChange }: StrategySelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="strategy" className="text-sm font-medium text-foreground">
        Strategy
      </label>
      <select
        id="strategy"
        value={value}
        onChange={(event) => onChange(event.target.value as StrategyId)}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        {STRATEGY_IDS.map((id) => (
          <option key={id} value={id}>
            {STRATEGY_DEFINITIONS[id].name}
          </option>
        ))}
      </select>
    </div>
  )
}
