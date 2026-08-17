"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Calculator, Target, Wand2 } from "lucide-react"
import type { Stock } from "@/lib/stocks"
import type { LegDraft, OptionLeg, RiskPreference, StrategyCandidate, StrategyGoal, StrategyId, TechnicalSnapshot } from "../domain/types"
import { STRATEGY_DEFINITIONS } from "../domain/strategy-definitions"
import { buildStrategyCandidates, defaultGoalFromStock } from "../domain/recommendation-engine"
import { validateLegs } from "../domain/validation"
import { calculateStrategyMetrics } from "../domain/metrics"
import { createModelDrafts, getModelAssumptions } from "../domain/model-pricing"
import { GuidedStrategyFinder } from "./guided-strategy-finder"
import { StrategySelector } from "./strategy-selector"
import { ExpirySelector } from "./expiry-selector"
import { OptionLegsTable } from "./option-legs-table"
import { DataQualityWarning } from "./data-quality-warning"
import { StrategyExplanation } from "./strategy-explanation"
import { StrategyMetricsCards } from "./strategy-metrics"
import { PayoffChart } from "./payoff-chart"

type OptionsStrategiesPanelProps = {
  stock: Stock
}

function parsePositive(value: string) {
  if (value.trim() === "") return Number.NaN
  return Number(value)
}

function draftsToLegs(drafts: LegDraft[], expiry: string): OptionLeg[] {
  return drafts.map((draft) => ({
    id: draft.id,
    optionType: draft.optionType,
    side: draft.side,
    strike: parsePositive(draft.strike),
    premium: parsePositive(draft.premium),
    quantity: parsePositive(draft.quantity),
    lotSize: parsePositive(draft.lotSize),
    expiry,
  }))
}

export function OptionsStrategiesPanel({ stock }: OptionsStrategiesPanelProps) {
  const [strategyId, setStrategyId] = useState<StrategyId>("long-call")
  const [riskPreference, setRiskPreference] = useState<RiskPreference>("balanced")
  const [strategyGoal, setStrategyGoal] = useState<StrategyGoal>(() => defaultGoalFromStock(stock.change))
  const [technicalSnapshot, setTechnicalSnapshot] = useState<TechnicalSnapshot | null>(null)
  const [loadingSignal, setLoadingSignal] = useState(true)
  const [spotPrice, setSpotPrice] = useState(String(stock.price))
  const initialAssumptions = getModelAssumptions(stock.price, stock.change, null, "")
  const [expiry, setExpiry] = useState(initialAssumptions.expiry)
  const [legs, setLegs] = useState<LegDraft[]>(() => createModelDrafts("long-call", stock.price, stock.change, null, initialAssumptions.expiry))

  const definition = STRATEGY_DEFINITIONS[strategyId]
  const candidates = useMemo(() => {
    return buildStrategyCandidates(
      { symbol: stock.symbol, change: stock.change, technical: technicalSnapshot },
      strategyGoal,
      riskPreference
    )
  }, [riskPreference, stock.change, stock.symbol, strategyGoal, technicalSnapshot])
  const parsedSpot = parsePositive(spotPrice)
  const parsedLegs = useMemo(() => draftsToLegs(legs, expiry), [legs, expiry])
  const issues = useMemo(() => validateLegs(parsedLegs, strategyId, parsedSpot), [parsedLegs, strategyId, parsedSpot])
  const blocked = issues.some((issue) => issue.severity === "error")
  const metrics = useMemo(() => blocked ? null : calculateStrategyMetrics(parsedLegs, parsedSpot), [blocked, parsedLegs, parsedSpot])
  const capitalAtRisk = metrics?.maxLoss == null ? null : Math.abs(metrics.maxLoss)
  const rewardToRisk =
    metrics?.maxProfit != null && capitalAtRisk && capitalAtRisk > 0
      ? metrics.maxProfit / capitalAtRisk
      : null
  const assumptions = getModelAssumptions(parsedSpot, stock.change, technicalSnapshot, expiry)

  const handleStrategyChange = (next: StrategyId) => {
    setStrategyId(next)
    setLegs(createModelDrafts(next, Number(spotPrice) || stock.price, stock.change, technicalSnapshot, expiry))
  }

  const handleCandidateSelect = (candidate: StrategyCandidate) => {
    setStrategyId(candidate.strategyId)
    setLegs(createModelDrafts(candidate.strategyId, Number(spotPrice) || stock.price, stock.change, technicalSnapshot, expiry))
  }

  const handleResetModel = () => {
    const nextAssumptions = getModelAssumptions(stock.price, stock.change, technicalSnapshot, "")
    setExpiry(nextAssumptions.expiry)
    setSpotPrice(String(stock.price))
    setLegs(createModelDrafts(strategyId, stock.price, stock.change, technicalSnapshot, nextAssumptions.expiry))
  }

  const handleRepriceModel = () => {
    setLegs(createModelDrafts(strategyId, Number(spotPrice) || stock.price, stock.change, technicalSnapshot, expiry))
  }

  const handleLegChange = (id: string, field: keyof LegDraft, value: string) => {
    setLegs((current) => current.map((leg) => leg.id === id ? { ...leg, [field]: value } : leg))
  }

  useEffect(() => {
    let active = true

    async function fetchTechnicalSignal() {
      setLoadingSignal(true)
      try {
        const response = await fetch(`/api/backend/full/${stock.symbol}.NS`, { cache: "no-store" })
        const data = await response.json()
        if (!active) return
        setTechnicalSnapshot({
          signal: data?.signal?.signal ?? null,
          overallScore: data?.signal?.overall_score ?? null,
          rsi: data?.indicators?.RSI ?? null,
          adx: data?.indicators?.ADX ?? null,
        })
      } catch {
        if (active) setTechnicalSnapshot(null)
      } finally {
        if (active) setLoadingSignal(false)
      }
    }

    fetchTechnicalSignal()
    return () => { active = false }
  }, [stock.symbol])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-card">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calculator size={24} />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Automated simulator</span>
                  <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-300">Model-estimated premiums</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Options Strategy Lab</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Build, compare and explain options strategies for {stock.symbol}. The lab auto-selects expiry, strikes and estimated premiums from the current stock context.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border bg-background/60 lg:border-l lg:border-t-0">
            <div className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Spot</p>
              <p className="mt-1 text-lg font-bold text-foreground">Rs {stock.price.toLocaleString("en-IN")}</p>
            </div>
            <div className="border-l border-border p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Move</p>
              <p className={stock.change >= 0 ? "mt-1 text-lg font-bold text-primary" : "mt-1 text-lg font-bold text-destructive"}>
                {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
              </p>
            </div>
            <div className="border-l border-border p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Model IV</p>
              <p className="mt-1 truncate text-lg font-bold text-foreground">{Math.round(assumptions.annualVolatility * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <Wand2 size={18} />
            <p className="text-sm font-semibold">Auto strategy setup</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Every strategy gets model-picked strikes, expiry, premiums and lot size from the current stock price.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sky-300">
            <Activity size={18} />
            <p className="text-sm font-semibold">Payoff engine</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">The graph recalculates max profit, max loss, breakevens and profit zones as inputs change.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <Target size={18} />
            <p className="text-sm font-semibold">Live-data ready</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Live bid/ask, OI, IV and Greeks stay hidden until broker data access is available.</p>
        </div>
      </div>

      <GuidedStrategyFinder
        symbol={stock.symbol}
        change={stock.change}
        risk={riskPreference}
        goal={strategyGoal}
        candidates={candidates}
        loadingSignal={loadingSignal}
        onRiskChange={setRiskPreference}
        onGoalChange={setStrategyGoal}
        onSelectCandidate={handleCandidateSelect}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <StrategySelector value={strategyId} onChange={handleStrategyChange} />
        <ExpirySelector value={expiry} onChange={setExpiry} />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="spot-price" className="text-sm font-medium text-foreground">
              Spot price
            </label>
            <button
              type="button"
              onClick={handleResetModel}
              className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Reset model
            </button>
          </div>
          <input
            id="spot-price"
            inputMode="decimal"
            value={spotPrice}
            onChange={(event) => setSpotPrice(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground md:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Model expiry</p>
          <p className="mt-1 font-semibold text-foreground">{expiry}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Days to expiry</p>
          <p className="mt-1 font-semibold text-foreground">{assumptions.daysToExpiry}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Estimated IV</p>
          <p className="mt-1 font-semibold text-foreground">{Math.round(assumptions.annualVolatility * 100)}%</p>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRepriceModel}
            className="min-h-10 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reprice with model
          </button>
        </div>
      </div>

      <StrategyExplanation definition={definition} />
      <DataQualityWarning issues={issues} />
      <OptionLegsTable legs={legs} onChange={handleLegChange} />
      <StrategyMetricsCards metrics={metrics} blocked={blocked} rewardToRisk={rewardToRisk} capitalAtRisk={capitalAtRisk} />
      <PayoffChart points={metrics?.graphPoints ?? []} spotPrice={parsedSpot} legs={blocked ? [] : parsedLegs} metrics={metrics} />

      {!blocked && metrics && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p>
            Profit zones: {metrics.profitZones.length ? metrics.profitZones.join("; ") : "none in displayed range"}.
          </p>
          <p className="mt-1">
            Loss zones: {metrics.lossZones.length ? metrics.lossZones.join("; ") : "none in displayed range"}.
          </p>
        </div>
      )}
    </div>
  )
}
