import type { LegDraft, OptionType, StrategyId, TechnicalSnapshot } from "./types"
import { createLegDrafts } from "./strategy-definitions"

export type ModelAssumptions = {
  expiry: string
  daysToExpiry: number
  annualVolatility: number
  riskFreeRate: number
  dividendYield: number
  strikeStep: number
  pricingMode: "model-estimated"
}

type PricedOption = {
  premium: number
  delta: number
}

const DEFAULT_LOT_SIZE = "100"
const DEFAULT_RISK_FREE_RATE = 0.068
const DEFAULT_DIVIDEND_YIELD = 0.012

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * erf)
}

function optionPremium(spot: number, strike: number, daysToExpiry: number, volatility: number, optionType: OptionType): PricedOption {
  const time = Math.max(daysToExpiry, 1) / 365
  const sqrtTime = Math.sqrt(time)
  const rateMinusYield = DEFAULT_RISK_FREE_RATE - DEFAULT_DIVIDEND_YIELD
  const sigmaRootT = Math.max(volatility * sqrtTime, 0.0001)
  const d1 = (Math.log(spot / strike) + (rateMinusYield + 0.5 * volatility * volatility) * time) / sigmaRootT
  const d2 = d1 - sigmaRootT
  const discountedSpot = spot * Math.exp(-DEFAULT_DIVIDEND_YIELD * time)
  const discountedStrike = strike * Math.exp(-DEFAULT_RISK_FREE_RATE * time)

  if (optionType === "call") {
    return {
      premium: Math.max(0.5, discountedSpot * normalCdf(d1) - discountedStrike * normalCdf(d2)),
      delta: normalCdf(d1),
    }
  }

  return {
    premium: Math.max(0.5, discountedStrike * normalCdf(-d2) - discountedSpot * normalCdf(-d1)),
    delta: normalCdf(d1) - 1,
  }
}

export function strikeStep(price: number) {
  if (price >= 2500) return 100
  if (price >= 1000) return 50
  if (price >= 250) return 10
  return 5
}

function roundStrike(price: number, offsetSteps = 0) {
  const step = strikeStep(price)
  return Math.max(step, Math.round(price / step) * step + offsetSteps * step)
}

function nextMonthlyExpiry(from = new Date()) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + 1)
  date.setDate(1)

  const month = date.getMonth()
  const lastDay = new Date(date.getFullYear(), month + 1, 0)
  while (lastDay.getDay() !== 4) {
    lastDay.setDate(lastDay.getDate() - 1)
  }

  return lastDay.toISOString().slice(0, 10)
}

function daysToExpiry(expiry: string) {
  const expiryDate = new Date(`${expiry}T15:30:00+05:30`)
  const diff = expiryDate.getTime() - Date.now()
  return Math.max(1, Math.ceil(diff / 86_400_000))
}

export function estimateVolatility(change: number, technical: TechnicalSnapshot | null) {
  const moveComponent = Math.min(0.18, Math.abs(change) / 100 * 4)
  const rsi = technical?.rsi ?? 50
  const adx = technical?.adx ?? 20
  const rsiComponent = Math.min(0.08, Math.abs(rsi - 50) / 100)
  const trendComponent = Math.min(0.08, Math.max(0, adx - 18) / 100)
  return Number(Math.max(0.18, Math.min(0.55, 0.22 + moveComponent + rsiComponent + trendComponent)).toFixed(3))
}

function targetStrikes(strategyId: StrategyId, spot: number): Record<string, number> {
  const atm = roundStrike(spot)
  const lower1 = roundStrike(spot, -1)
  const lower2 = roundStrike(spot, -2)
  const upper1 = roundStrike(spot, 1)
  const upper2 = roundStrike(spot, 2)

  return {
    "long-call": strategyId === "long-call" ? upper1 : atm,
    "long-put": strategyId === "long-put" ? lower1 : atm,
    "long-lower-call": atm,
    "short-higher-call": upper2,
    "long-higher-put": atm,
    "short-lower-put": lower2,
    "long-lower-put": lower2,
    "short-higher-put": lower1,
    "short-lower-call": upper1,
    "long-higher-call": upper2,
    "short-middle-put": atm,
    "short-middle-call": atm,
  }
}

export function buildModelAssumptions(change: number, technical: TechnicalSnapshot | null, expiry?: string): ModelAssumptions {
  const modelExpiry = expiry || nextMonthlyExpiry()

  return {
    expiry: modelExpiry,
    daysToExpiry: daysToExpiry(modelExpiry),
    annualVolatility: estimateVolatility(change, technical),
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
    dividendYield: DEFAULT_DIVIDEND_YIELD,
    strikeStep: 0,
    pricingMode: "model-estimated",
  }
}

export function createModelDrafts(
  strategyId: StrategyId,
  spot: number,
  change: number,
  technical: TechnicalSnapshot | null,
  expiry: string
): LegDraft[] {
  const safeSpot = Number.isFinite(spot) && spot > 0 ? spot : 100
  const assumptions = buildModelAssumptions(change, technical, expiry)
  const strikes = targetStrikes(strategyId, safeSpot)

  return createLegDrafts(strategyId).map((draft) => {
    const strike = strikes[draft.id] ?? roundStrike(safeSpot)
    const priced = optionPremium(safeSpot, strike, assumptions.daysToExpiry, assumptions.annualVolatility, draft.optionType)
    const spreadBuffer = draft.side === "long" ? 1.015 : 0.985
    return {
      ...draft,
      strike: String(strike),
      premium: (Math.round(priced.premium * spreadBuffer * 20) / 20).toFixed(2),
      quantity: "1",
      lotSize: DEFAULT_LOT_SIZE,
    }
  })
}

export function getModelAssumptions(
  spot: number,
  change: number,
  technical: TechnicalSnapshot | null,
  expiry: string
): ModelAssumptions {
  return {
    ...buildModelAssumptions(change, technical, expiry),
    strikeStep: strikeStep(spot),
  }
}
