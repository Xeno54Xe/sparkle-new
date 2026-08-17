import type { OptionLeg, PayoffPoint } from "./types"

export function calculateLegPayoff(leg: OptionLeg, expiryPrice: number) {
  const intrinsic =
    leg.optionType === "call"
      ? Math.max(expiryPrice - leg.strike, 0)
      : Math.max(leg.strike - expiryPrice, 0)

  const perShare =
    leg.side === "long"
      ? intrinsic - leg.premium
      : leg.premium - intrinsic

  return perShare * leg.quantity * leg.lotSize
}

export function calculateStrategyPayoff(legs: OptionLeg[], expiryPrice: number) {
  return legs.reduce((sum, leg) => sum + calculateLegPayoff(leg, expiryPrice), 0)
}

export function calculateNetPremium(legs: OptionLeg[]) {
  return legs.reduce((sum, leg) => {
    const value = leg.premium * leg.quantity * leg.lotSize
    return leg.side === "long" ? sum - value : sum + value
  }, 0)
}

export function buildPriceRange(spotPrice: number, strikes: number[], breakevens: number[] = []) {
  const anchors = [spotPrice, ...strikes, ...breakevens].filter((value) => Number.isFinite(value) && value > 0)
  const minAnchor = Math.min(...anchors)
  const maxAnchor = Math.max(...anchors)
  const width = Math.max(maxAnchor - minAnchor, spotPrice * 0.3, 1)
  const min = Math.max(0, minAnchor - width * 0.65)
  const max = maxAnchor + width * 0.65

  return { min, max }
}

export function generatePayoffPoints(legs: OptionLeg[], spotPrice: number, resolution = 80): PayoffPoint[] {
  const strikes = legs.map((leg) => leg.strike)
  const { min, max } = buildPriceRange(spotPrice, strikes)
  const step = (max - min) / Math.max(resolution - 1, 1)

  return Array.from({ length: resolution }, (_, index) => {
    const expiryPrice = min + step * index
    return {
      expiryPrice: Number(expiryPrice.toFixed(2)),
      payoff: Number(calculateStrategyPayoff(legs, expiryPrice).toFixed(2)),
    }
  })
}
