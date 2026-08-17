import type { RiskPreference, StrategyCandidate, StrategyGoal, StrategyId, TechnicalSnapshot } from "./types"
import { STRATEGY_DEFINITIONS } from "./strategy-definitions"

type StockContext = {
  symbol: string
  change: number
  technical: TechnicalSnapshot | null
}

const GOAL_STRATEGIES: Record<StrategyGoal, StrategyId[]> = {
  "not-sure": ["bull-call-spread", "bear-put-spread", "iron-condor"],
  upside: ["bull-call-spread", "bull-put-spread", "long-call"],
  downside: ["bear-put-spread", "bear-call-spread", "long-put"],
  "range-bound": ["iron-condor", "iron-butterfly", "bull-put-spread"],
  "big-move": ["long-straddle", "long-strangle", "long-call"],
}

const RISK_STRATEGIES: Record<RiskPreference, StrategyId[]> = {
  "lower-risk": ["bull-call-spread", "bear-put-spread", "bull-put-spread", "bear-call-spread", "iron-condor"],
  balanced: ["bull-call-spread", "bear-put-spread", "bull-put-spread", "bear-call-spread", "iron-condor", "long-call", "long-put"],
  "high-risk": ["long-call", "long-put", "long-straddle", "long-strangle", "iron-butterfly"],
}

function movementBias(change: number) {
  if (change >= 1) return "bullish"
  if (change <= -1) return "bearish"
  return "neutral"
}

function technicalBias(technical: TechnicalSnapshot | null) {
  if (technical?.signal === "BUY") return "bullish"
  if (technical?.signal === "SELL") return "bearish"
  return "neutral"
}

function strategyBias(strategyId: StrategyId) {
  if (["long-call", "bull-call-spread", "bull-put-spread"].includes(strategyId)) return "bullish"
  if (["long-put", "bear-put-spread", "bear-call-spread"].includes(strategyId)) return "bearish"
  if (["iron-condor", "iron-butterfly"].includes(strategyId)) return "neutral"
  return "volatile"
}

function setupGuide(strategyId: StrategyId) {
  const definition = STRATEGY_DEFINITIONS[strategyId]
  return definition.legTemplates.map((leg) => {
    const direction = leg.side === "long" ? "Buy" : "Sell"
    return `${direction} a ${leg.optionType} leg: ${leg.label.toLowerCase()}.`
  })
}

function riskRewardText(strategyId: StrategyId, risk: RiskPreference) {
  if (["long-call", "long-put", "long-straddle", "long-strangle"].includes(strategyId)) {
    return risk === "high-risk"
      ? "Higher reward potential with full premium at risk"
      : "Simple but premium can decay quickly"
  }
  if (["iron-condor", "iron-butterfly"].includes(strategyId)) return "Defined-risk range strategy with capped profit"
  return "Defined-risk spread with capped profit and capped loss"
}

export function defaultGoalFromStock(change: number): StrategyGoal {
  if (change >= 1) return "upside"
  if (change <= -1) return "downside"
  return "not-sure"
}

export function buildStrategyCandidates(
  context: StockContext,
  goal: StrategyGoal,
  risk: RiskPreference
): StrategyCandidate[] {
  const movement = movementBias(context.change)
  const technical = technicalBias(context.technical)
  const goalSet = new Set(GOAL_STRATEGIES[goal])
  const riskSet = new Set(RISK_STRATEGIES[risk])
  const all = Object.keys(STRATEGY_DEFINITIONS) as StrategyId[]

  return all
    .map((strategyId) => {
      const definition = STRATEGY_DEFINITIONS[strategyId]
      const bias = strategyBias(strategyId)
      let score = 35

      if (goalSet.has(strategyId)) score += 28
      if (riskSet.has(strategyId)) score += 22
      if (bias === movement) score += 12
      if (bias === technical) score += 10
      if (goal === "big-move" && bias === "volatile") score += 24
      if (goal === "range-bound" && bias === "neutral") score += 24
      if (definition.definedRisk) score += 6
      if (risk === "lower-risk" && !definition.profitCapped) score -= 18
      if (risk === "high-risk" && !definition.profitCapped) score += 10

      const why = [
        `${context.symbol} is reading ${movement} from today's percentage move.`,
        `Technical signal is ${context.technical?.signal ?? "not confirmed"}${context.technical?.overallScore != null ? ` with score ${context.technical.overallScore}` : ""}.`,
        `${definition.name} matches a ${definition.outlook.toLowerCase()} setup.`,
      ]

      if (goal !== "not-sure") why.push(`It fits the selected goal: ${goal.replace("-", " ")}.`)
      if (risk === "high-risk") why.push("This profile allows larger premium risk for higher payoff convexity.")
      if (risk === "lower-risk") why.push("This profile prefers capped-loss, capped-profit structures.")

      return {
        strategyId,
        score: Math.max(0, Math.min(100, score)),
        label: definition.name,
        fit: definition.outlook,
        riskReward: riskRewardText(strategyId, risk),
        why,
        setupGuide: setupGuide(strategyId),
        dataNeeds: [
          "Choose a real expiry from your broker or live option chain.",
          "Enter actual bid/ask-derived premiums.",
          "Enter the current lot size before relying on rupee P/L.",
        ],
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
