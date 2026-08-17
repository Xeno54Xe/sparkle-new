import type { OptionLeg, StrategyId, ValidationIssue } from "./types"

function issue(severity: ValidationIssue["severity"], code: string, message: string): ValidationIssue {
  return { severity, code, message }
}

function allSame<T>(values: T[]) {
  return new Set(values).size <= 1
}

function sortedStrikes(legs: OptionLeg[]) {
  return [...legs].sort((a, b) => a.strike - b.strike)
}

export function validateLegs(legs: OptionLeg[], strategyId: StrategyId, spotPrice: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!Number.isFinite(spotPrice) || spotPrice <= 0) {
    issues.push(issue("error", "invalid-spot", "Enter a positive spot price."))
  }

  if (legs.length === 0) {
    issues.push(issue("error", "missing-legs", "Add the required option legs."))
  }

  for (const leg of legs) {
    if (!leg.expiry) issues.push(issue("error", `${leg.id}-missing-expiry`, `${leg.id}: expiry is required.`))
    if (leg.expiry && Number.isNaN(Date.parse(leg.expiry))) issues.push(issue("error", `${leg.id}-invalid-expiry`, `${leg.id}: expiry is invalid.`))
    if (!Number.isFinite(leg.strike) || leg.strike <= 0) issues.push(issue("error", `${leg.id}-invalid-strike`, `${leg.id}: strike must be positive.`))
    if (!["call", "put"].includes(leg.optionType)) issues.push(issue("error", `${leg.id}-invalid-type`, `${leg.id}: option type is invalid.`))
    if (!Number.isFinite(leg.quantity) || leg.quantity <= 0) issues.push(issue("error", `${leg.id}-invalid-quantity`, `${leg.id}: quantity must be positive.`))
    if (!Number.isFinite(leg.lotSize) || leg.lotSize <= 0) issues.push(issue("error", `${leg.id}-invalid-lot-size`, `${leg.id}: lot size must be positive.`))
    if (!Number.isFinite(leg.premium)) issues.push(issue("error", `${leg.id}-missing-premium`, `${leg.id}: premium is required.`))
    if (Number.isFinite(leg.premium) && leg.premium < 0) issues.push(issue("error", `${leg.id}-negative-premium`, `${leg.id}: premium cannot be negative.`))
  }

  if (legs.length > 1 && !allSame(legs.map((leg) => leg.expiry))) {
    issues.push(issue("error", "mixed-expiries", "This first version supports one expiry per strategy."))
  }

  const duplicateKeys = legs.map((leg) => `${leg.optionType}:${leg.side}:${leg.strike}:${leg.expiry}`)
  if (new Set(duplicateKeys).size !== duplicateKeys.length) {
    issues.push(issue("error", "duplicate-legs", "Duplicate option legs are not allowed."))
  }

  validateStrategyShape(strategyId, legs, issues)

  issues.push(issue("warning", "manual-mode", "Model mode uses estimated premiums and editable strikes, not live option-chain quotes."))
  issues.push(issue("warning", "missing-quote-timestamp", "Live quote timestamp is unavailable until broker data is connected."))
  issues.push(issue("warning", "missing-liquidity", "Open interest, volume, bid-ask spread and liquidity checks require a live option-chain data source."))
  issues.push(issue("info", "no-advice", "This calculator is educational and does not execute trades or provide personalized advice."))

  return issues
}

function validateStrategyShape(strategyId: StrategyId, legs: OptionLeg[], issues: ValidationIssue[]) {
  const calls = legs.filter((leg) => leg.optionType === "call")
  const puts = legs.filter((leg) => leg.optionType === "put")
  const longs = legs.filter((leg) => leg.side === "long")
  const shorts = legs.filter((leg) => leg.side === "short")
  const quantities = legs.map((leg) => leg.quantity)

  if (legs.length > 1 && !allSame(quantities)) {
    issues.push(issue("error", "quantity-mismatch", "All strategy legs must use equal quantities."))
  }

  switch (strategyId) {
    case "long-call":
      if (legs.length !== 1 || calls.length !== 1 || longs.length !== 1) issues.push(issue("error", "invalid-long-call", "Long call requires one long call."))
      break
    case "long-put":
      if (legs.length !== 1 || puts.length !== 1 || longs.length !== 1) issues.push(issue("error", "invalid-long-put", "Long put requires one long put."))
      break
    case "bull-call-spread": {
      if (calls.length !== 2 || longs.length !== 1 || shorts.length !== 1) issues.push(issue("error", "invalid-bull-call", "Bull call spread requires one long call and one short call."))
      const long = calls.find((leg) => leg.side === "long")
      const short = calls.find((leg) => leg.side === "short")
      if (long && short && long.strike >= short.strike) issues.push(issue("error", "invalid-bull-call-order", "Bull call spread requires long lower strike and short higher strike."))
      break
    }
    case "bear-put-spread": {
      if (puts.length !== 2 || longs.length !== 1 || shorts.length !== 1) issues.push(issue("error", "invalid-bear-put", "Bear put spread requires one long put and one short put."))
      const long = puts.find((leg) => leg.side === "long")
      const short = puts.find((leg) => leg.side === "short")
      if (long && short && long.strike <= short.strike) issues.push(issue("error", "invalid-bear-put-order", "Bear put spread requires long higher strike and short lower strike."))
      break
    }
    case "bull-put-spread": {
      if (puts.length !== 2 || longs.length !== 1 || shorts.length !== 1) issues.push(issue("error", "invalid-bull-put", "Bull put spread requires one long put and one short put."))
      const long = puts.find((leg) => leg.side === "long")
      const short = puts.find((leg) => leg.side === "short")
      if (long && short && long.strike >= short.strike) issues.push(issue("error", "invalid-bull-put-order", "Bull put spread requires long lower strike and short higher strike."))
      break
    }
    case "bear-call-spread": {
      if (calls.length !== 2 || longs.length !== 1 || shorts.length !== 1) issues.push(issue("error", "invalid-bear-call", "Bear call spread requires one short call and one long call."))
      const short = calls.find((leg) => leg.side === "short")
      const long = calls.find((leg) => leg.side === "long")
      if (short && long && short.strike >= long.strike) issues.push(issue("error", "invalid-bear-call-order", "Bear call spread requires short lower strike and long higher strike."))
      break
    }
    case "long-straddle":
      if (legs.length !== 2 || calls.length !== 1 || puts.length !== 1 || shorts.length > 0) issues.push(issue("error", "invalid-straddle", "Long straddle requires one long call and one long put."))
      if (legs.length === 2 && !allSame(legs.map((leg) => leg.strike))) issues.push(issue("error", "invalid-straddle-strike", "Long straddle requires the same strike for both legs."))
      break
    case "long-strangle": {
      if (legs.length !== 2 || calls.length !== 1 || puts.length !== 1 || shorts.length > 0) issues.push(issue("error", "invalid-strangle", "Long strangle requires one long put and one long call."))
      const put = puts[0]
      const call = calls[0]
      if (put && call && put.strike >= call.strike) issues.push(issue("error", "invalid-strangle-order", "Long strangle requires lower put strike and higher call strike."))
      break
    }
    case "iron-condor": {
      if (legs.length !== 4 || calls.length !== 2 || puts.length !== 2 || longs.length !== 2 || shorts.length !== 2) issues.push(issue("error", "invalid-condor", "Iron condor requires two puts, two calls, two longs and two shorts."))
      const ordered = sortedStrikes(legs)
      const shape = ordered.map((leg) => `${leg.side}-${leg.optionType}`).join("|")
      if (shape !== "long-put|short-put|short-call|long-call") issues.push(issue("error", "invalid-condor-order", "Iron condor strikes must be long put, short put, short call, long call."))
      break
    }
    case "iron-butterfly": {
      if (legs.length !== 4 || calls.length !== 2 || puts.length !== 2 || longs.length !== 2 || shorts.length !== 2) issues.push(issue("error", "invalid-butterfly", "Iron butterfly requires two puts, two calls, two longs and two shorts."))
      const shortPut = puts.find((leg) => leg.side === "short")
      const shortCall = calls.find((leg) => leg.side === "short")
      if (shortPut && shortCall && shortPut.strike !== shortCall.strike) issues.push(issue("error", "invalid-butterfly-middle", "Iron butterfly short put and short call must share the same middle strike."))
      const ordered = sortedStrikes(legs)
      if (ordered[0]?.side !== "long" || ordered[3]?.side !== "long") issues.push(issue("error", "invalid-butterfly-wings", "Iron butterfly must have long outside wings."))
      break
    }
  }
}
