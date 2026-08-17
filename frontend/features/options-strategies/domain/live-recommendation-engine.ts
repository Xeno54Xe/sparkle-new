import type {
  OptionContract,
  OptionLeg,
  RiskPreference,
  StrategyGoal,
  StrategyId,
  StrategyLiveLeg,
  StrategyLiveSuggestion,
  TechnicalSnapshot,
} from "./types"
import { calculateStrategyMetrics } from "./metrics"
import { buildStrategyCandidates } from "./recommendation-engine"
import { STRATEGY_DEFINITIONS } from "./strategy-definitions"

type BuildLiveRecommendationsInput = {
  symbol: string
  change: number
  spotPrice: number
  expiries: string[]
  contracts: OptionContract[]
  goal: StrategyGoal
  risk: RiskPreference
  technical: TechnicalSnapshot | null
  provider: string
}

type LegTarget = {
  id: string
  label: string
  side: "long" | "short"
  optionType: "call" | "put"
  strikeRelation?: "above" | "below" | "atm"
  targetDelta?: number
}

const TARGET_DTE: Record<RiskPreference, number> = {
  "lower-risk": 35,
  balanced: 24,
  "high-risk": 14,
}

function daysToExpiry(expiry: string) {
  const expiryDate = new Date(`${expiry}T15:30:00+05:30`)
  const today = Date.now()
  return Math.max(0, Math.round((expiryDate.getTime() - today) / 86_400_000))
}

export function selectModelExpiry(expiries: string[], goal: StrategyGoal, risk: RiskPreference) {
  const futureExpiries = expiries
    .filter((expiry) => Number.isFinite(new Date(expiry).getTime()) && daysToExpiry(expiry) >= 0)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  if (!futureExpiries.length) return null

  const target = goal === "big-move" ? Math.min(18, TARGET_DTE[risk]) : TARGET_DTE[risk]
  return futureExpiries.reduce((best, expiry) => {
    const bestDistance = Math.abs(daysToExpiry(best) - target)
    const distance = Math.abs(daysToExpiry(expiry) - target)
    return distance < bestDistance ? expiry : best
  }, futureExpiries[0])
}

function tradablePrice(contract: OptionContract, side: "long" | "short") {
  if (side === "long") return contract.ask && contract.ask > 0 ? contract.ask : contract.lastPrice
  return contract.bid && contract.bid > 0 ? contract.bid : contract.lastPrice
}

function contractPenalty(contract: OptionContract, side: "long" | "short", spotPrice: number, target: LegTarget) {
  const price = tradablePrice(contract, side)
  if (price == null || price <= 0) return Number.POSITIVE_INFINITY

  let penalty = 0
  const absoluteDelta = contract.delta == null ? null : Math.abs(contract.delta)
  if (target.targetDelta != null && absoluteDelta != null) penalty += Math.abs(absoluteDelta - target.targetDelta) * 100
  if (target.strikeRelation === "above" && contract.strike < spotPrice) penalty += 35
  if (target.strikeRelation === "below" && contract.strike > spotPrice) penalty += 35
  if (target.strikeRelation === "atm") penalty += Math.abs(contract.strike - spotPrice) / Math.max(spotPrice, 1) * 100

  const liquidity = contract.liquidityScore ?? 50
  penalty += Math.max(0, 70 - liquidity) * 0.35
  if ((contract.openInterest ?? 0) <= 0) penalty += 8
  if ((contract.volume ?? 0) <= 0) penalty += 6

  return penalty
}

function chooseContract(
  contracts: OptionContract[],
  usedSymbols: Set<string>,
  spotPrice: number,
  target: LegTarget
) {
  return contracts
    .filter((contract) => contract.optionType === target.optionType && !usedSymbols.has(contract.contractSymbol))
    .map((contract) => ({ contract, penalty: contractPenalty(contract, target.side, spotPrice, target) }))
    .filter((entry) => Number.isFinite(entry.penalty))
    .sort((a, b) => a.penalty - b.penalty)[0]?.contract ?? null
}

function targetsForStrategy(strategyId: StrategyId): LegTarget[] {
  switch (strategyId) {
    case "long-call":
      return [{ id: "long-call", label: "Buy call", optionType: "call", side: "long", strikeRelation: "above", targetDelta: 0.5 }]
    case "long-put":
      return [{ id: "long-put", label: "Buy put", optionType: "put", side: "long", strikeRelation: "below", targetDelta: 0.5 }]
    case "bull-call-spread":
      return [
        { id: "long-lower-call", label: "Buy lower call", optionType: "call", side: "long", strikeRelation: "atm", targetDelta: 0.5 },
        { id: "short-higher-call", label: "Sell higher call", optionType: "call", side: "short", strikeRelation: "above", targetDelta: 0.3 },
      ]
    case "bear-put-spread":
      return [
        { id: "long-higher-put", label: "Buy higher put", optionType: "put", side: "long", strikeRelation: "atm", targetDelta: 0.5 },
        { id: "short-lower-put", label: "Sell lower put", optionType: "put", side: "short", strikeRelation: "below", targetDelta: 0.3 },
      ]
    case "bull-put-spread":
      return [
        { id: "long-lower-put", label: "Buy lower put", optionType: "put", side: "long", strikeRelation: "below", targetDelta: 0.18 },
        { id: "short-higher-put", label: "Sell higher put", optionType: "put", side: "short", strikeRelation: "below", targetDelta: 0.35 },
      ]
    case "bear-call-spread":
      return [
        { id: "short-lower-call", label: "Sell lower call", optionType: "call", side: "short", strikeRelation: "above", targetDelta: 0.35 },
        { id: "long-higher-call", label: "Buy higher call", optionType: "call", side: "long", strikeRelation: "above", targetDelta: 0.18 },
      ]
    case "long-straddle":
      return [
        { id: "long-call", label: "Buy call", optionType: "call", side: "long", strikeRelation: "atm", targetDelta: 0.5 },
        { id: "long-put", label: "Buy put", optionType: "put", side: "long", strikeRelation: "atm", targetDelta: 0.5 },
      ]
    case "long-strangle":
      return [
        { id: "long-lower-put", label: "Buy lower put", optionType: "put", side: "long", strikeRelation: "below", targetDelta: 0.3 },
        { id: "long-higher-call", label: "Buy higher call", optionType: "call", side: "long", strikeRelation: "above", targetDelta: 0.3 },
      ]
    case "iron-condor":
      return [
        { id: "long-lower-put", label: "Buy lower put", optionType: "put", side: "long", strikeRelation: "below", targetDelta: 0.12 },
        { id: "short-higher-put", label: "Sell higher put", optionType: "put", side: "short", strikeRelation: "below", targetDelta: 0.25 },
        { id: "short-lower-call", label: "Sell lower call", optionType: "call", side: "short", strikeRelation: "above", targetDelta: 0.25 },
        { id: "long-higher-call", label: "Buy higher call", optionType: "call", side: "long", strikeRelation: "above", targetDelta: 0.12 },
      ]
    case "iron-butterfly":
      return [
        { id: "long-lower-put", label: "Buy lower put", optionType: "put", side: "long", strikeRelation: "below", targetDelta: 0.15 },
        { id: "short-middle-put", label: "Sell middle put", optionType: "put", side: "short", strikeRelation: "atm", targetDelta: 0.5 },
        { id: "short-middle-call", label: "Sell middle call", optionType: "call", side: "short", strikeRelation: "atm", targetDelta: 0.5 },
        { id: "long-higher-call", label: "Buy higher call", optionType: "call", side: "long", strikeRelation: "above", targetDelta: 0.15 },
      ]
  }
}

function toLiveLeg(target: LegTarget, contract: OptionContract, expiry: string): StrategyLiveLeg {
  const premium = tradablePrice(contract, target.side) ?? contract.lastPrice ?? 0

  return {
    id: target.id,
    label: target.label,
    optionType: target.optionType,
    side: target.side,
    strike: contract.strike,
    premium,
    quantity: 1,
    lotSize: contract.lotSize ?? 1,
    expiry,
    contractSymbol: contract.contractSymbol,
    bid: contract.bid,
    ask: contract.ask,
    lastPrice: contract.lastPrice,
    openInterest: contract.openInterest,
    volume: contract.volume,
    impliedVolatility: contract.impliedVolatility,
    delta: contract.delta,
  }
}

function sortLegsForValidation(strategyId: StrategyId, legs: StrategyLiveLeg[]) {
  const order = STRATEGY_DEFINITIONS[strategyId].legTemplates.map((template) => template.id)
  return [...legs].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}

function toOptionLeg(leg: StrategyLiveLeg): OptionLeg {
  return {
    id: leg.id,
    optionType: leg.optionType,
    side: leg.side,
    strike: leg.strike,
    premium: leg.premium,
    quantity: leg.quantity,
    lotSize: leg.lotSize,
    expiry: leg.expiry,
    contractSymbol: leg.contractSymbol,
  }
}

function estimateNetPremium(legs: StrategyLiveLeg[]) {
  return legs.reduce((total, leg) => total + (leg.side === "long" ? leg.premium : -leg.premium), 0)
}

function recommendationWarnings(legs: StrategyLiveLeg[]) {
  const warnings: string[] = []
  if (legs.some((leg) => (leg.bid == null || leg.ask == null || leg.bid <= 0 || leg.ask <= 0))) {
    warnings.push("Some legs use last traded price because bid/ask was incomplete.")
  }
  if (legs.some((leg) => (leg.volume ?? 0) <= 0 || (leg.openInterest ?? 0) <= 0)) {
    warnings.push("Some legs have weak volume or open interest; re-check liquidity before trading.")
  }
  if (legs.some((leg) => leg.lotSize <= 1)) {
    warnings.push("Lot size is not confirmed by the provider mapping; add a provider lot-size map for exact rupee P/L.")
  }
  return warnings
}

function buildLiveSuggestion(
  strategyId: StrategyId,
  baseScore: number,
  contracts: OptionContract[],
  spotPrice: number,
  expiry: string,
  provider: string
): StrategyLiveSuggestion | null {
  const usedSymbols = new Set<string>()
  const selected = targetsForStrategy(strategyId).map((target) => {
    const contract = chooseContract(contracts, usedSymbols, spotPrice, target)
    if (!contract) return null
    usedSymbols.add(contract.contractSymbol)
    return toLiveLeg(target, contract, expiry)
  })

  if (selected.some((leg) => leg == null)) return null

  const legs = sortLegsForValidation(strategyId, selected as StrategyLiveLeg[])
  const metrics = calculateStrategyMetrics(legs.map(toOptionLeg), spotPrice)
  const averageLiquidity = legs.reduce((total, leg) => {
    const matching = contracts.find((contract) => contract.contractSymbol === leg.contractSymbol)
    return total + (matching?.liquidityScore ?? 50)
  }, 0) / legs.length

  return {
    strategyId,
    provider,
    expiry,
    expiryReason: `Selected ${expiry} because it is closest to the model's preferred time window for this risk profile.`,
    confidence: Math.round(Math.max(0, Math.min(100, baseScore * 0.72 + averageLiquidity * 0.28))),
    estimatedPremium: Number(estimateNetPremium(legs).toFixed(2)),
    metrics,
    legs,
    warnings: recommendationWarnings(legs),
    why: [
      `${STRATEGY_DEFINITIONS[strategyId].name} matches the selected market view and risk comfort.`,
      "Strikes are selected using delta/ATM targets first, then liquidity quality.",
      "Premiums use ask for buys and bid for sells when available, otherwise last traded price.",
    ],
  }
}

export function buildLiveRecommendations(input: BuildLiveRecommendationsInput): StrategyLiveSuggestion[] {
  const expiry = selectModelExpiry(input.expiries, input.goal, input.risk)
  if (!expiry) return []

  const expiryContracts = input.contracts.filter((contract) => contract.expiry === expiry)
  const candidates = buildStrategyCandidates(
    { symbol: input.symbol, change: input.change, technical: input.technical },
    input.goal,
    input.risk
  )

  return candidates
    .map((candidate) => buildLiveSuggestion(candidate.strategyId, candidate.score, expiryContracts, input.spotPrice, expiry, input.provider))
    .filter((suggestion): suggestion is StrategyLiveSuggestion => suggestion != null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}
