export type OptionType = "call" | "put"
export type OptionSide = "long" | "short"
export type ValidationSeverity = "error" | "warning" | "info"
export type RiskPreference = "lower-risk" | "balanced" | "high-risk"
export type StrategyGoal = "not-sure" | "upside" | "downside" | "range-bound" | "big-move"

export type StrategyId =
  | "long-call"
  | "long-put"
  | "bull-call-spread"
  | "bear-put-spread"
  | "bull-put-spread"
  | "bear-call-spread"
  | "long-straddle"
  | "long-strangle"
  | "iron-condor"
  | "iron-butterfly"

export type OptionContract = {
  contractSymbol: string
  underlyingSymbol: string
  underlyingPrice: number
  exchange: string
  currency: string
  expiry: string
  strike: number
  optionType: OptionType
  bid: number | null
  ask: number | null
  lastPrice: number | null
  volume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  quoteTimestamp: string | null
  lotSize: number | null
  liquidityScore?: number
}

export type OptionLeg = {
  id: string
  optionType: OptionType
  side: OptionSide
  strike: number
  premium: number
  quantity: number
  lotSize: number
  expiry: string
  contractSymbol?: string
}

export type LegDraft = {
  id: string
  label: string
  optionType: OptionType
  side: OptionSide
  strike: string
  premium: string
  quantity: string
  lotSize: string
}

export type PayoffPoint = {
  expiryPrice: number
  payoff: number
}

export type StrategyDefinition = {
  id: StrategyId
  name: string
  outlook: string
  premiumProfile: "debit" | "credit" | "variable"
  definedRisk: boolean
  profitCapped: boolean
  lossCapped: boolean
  description: string
  cappedExplanation: string
  legTemplates: Array<{
    id: string
    label: string
    optionType: OptionType
    side: OptionSide
  }>
}

export type ValidationIssue = {
  severity: ValidationSeverity
  code: string
  message: string
}

export type StrategyMetrics = {
  netPremium: number
  maxProfit: number | null
  maxLoss: number | null
  breakevens: number[]
  graphPoints: PayoffPoint[]
  profitZones: string[]
  lossZones: string[]
}

export type TechnicalSnapshot = {
  signal: "BUY" | "SELL" | "HOLD" | null
  overallScore: number | null
  rsi: number | null
  adx: number | null
}

export type StrategyCandidate = {
  strategyId: StrategyId
  score: number
  label: string
  fit: string
  riskReward: string
  why: string[]
  setupGuide: string[]
  dataNeeds: string[]
  liveSuggestion?: StrategyLiveSuggestion
}

export type StrategyLiveLeg = {
  id: string
  label: string
  optionType: OptionType
  side: OptionSide
  strike: number
  premium: number
  quantity: number
  lotSize: number
  expiry: string
  contractSymbol: string
  bid: number | null
  ask: number | null
  lastPrice: number | null
  openInterest: number | null
  volume: number | null
  impliedVolatility: number | null
  delta: number | null
}

export type StrategyLiveSuggestion = {
  strategyId: StrategyId
  provider: string
  expiry: string
  expiryReason: string
  confidence: number
  estimatedPremium: number
  metrics: StrategyMetrics | null
  legs: StrategyLiveLeg[]
  warnings: string[]
  why: string[]
}

export type OptionsModelResponse = {
  mode: "live" | "needs-config" | "error"
  provider: string
  symbol: string
  underlyingPrice: number | null
  timestamp: string
  expiries: string[]
  recommendations: StrategyLiveSuggestion[]
  message: string
  setupHint?: string
}
