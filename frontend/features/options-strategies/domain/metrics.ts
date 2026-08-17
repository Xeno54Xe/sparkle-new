import { calculateNetPremium, calculateStrategyPayoff, generatePayoffPoints } from "./payoff-engine"
import type { OptionLeg, StrategyMetrics } from "./types"

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(2))))].sort((a, b) => a - b)
}

function findBreakevens(points: Array<{ expiryPrice: number; payoff: number }>) {
  const breakevens: number[] = []

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const current = points[index]

    if (prev.payoff === 0) breakevens.push(prev.expiryPrice)
    if ((prev.payoff < 0 && current.payoff > 0) || (prev.payoff > 0 && current.payoff < 0)) {
      const ratio = Math.abs(prev.payoff) / (Math.abs(prev.payoff) + Math.abs(current.payoff))
      breakevens.push(prev.expiryPrice + (current.expiryPrice - prev.expiryPrice) * ratio)
    }
  }

  return uniqueSorted(breakevens)
}

function describeZones(points: Array<{ expiryPrice: number; payoff: number }>, profitable: boolean) {
  const zones: string[] = []
  let start: number | null = null

  points.forEach((point, index) => {
    const matches = profitable ? point.payoff > 0 : point.payoff < 0
    if (matches && start === null) start = point.expiryPrice
    const next = points[index + 1]
    if (start !== null && (!next || (profitable ? next.payoff <= 0 : next.payoff >= 0))) {
      zones.push(`${start.toFixed(2)} to ${point.expiryPrice.toFixed(2)}`)
      start = null
    }
  })

  return zones
}

export function calculateStrategyMetrics(legs: OptionLeg[], spotPrice: number): StrategyMetrics {
  const coarsePoints = generatePayoffPoints(legs, spotPrice, 240)
  const breakevens = findBreakevens(coarsePoints)
  const graphPoints = generatePayoffPoints(legs, spotPrice, 90)
  const strikes = legs.map((leg) => leg.strike)
  const highAnchor = Math.max(spotPrice, ...strikes) * 5
  const highSlope = calculateStrategyPayoff(legs, highAnchor + 1) - calculateStrategyPayoff(legs, highAnchor)
  const keyPrices = uniqueSorted([0, spotPrice, ...strikes, ...breakevens, highAnchor])
  const keyPayoffs = keyPrices.map((price) => calculateStrategyPayoff(legs, price))
  const maxFiniteProfit = Math.max(...keyPayoffs)
  const maxFiniteLoss = Math.min(...keyPayoffs)

  return {
    netPremium: Number(calculateNetPremium(legs).toFixed(2)),
    maxProfit: highSlope > 0.0001 ? null : Number(maxFiniteProfit.toFixed(2)),
    maxLoss: Number(maxFiniteLoss.toFixed(2)),
    breakevens,
    graphPoints,
    profitZones: describeZones(coarsePoints, true),
    lossZones: describeZones(coarsePoints, false),
  }
}
