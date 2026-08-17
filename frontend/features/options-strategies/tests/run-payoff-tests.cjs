/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const root = path.resolve(__dirname, "..")
const domainDir = path.join(root, "domain")
const outDir = path.join(os.tmpdir(), "sparkle-options-strategies-tests")

function compileDomain() {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, "domain"), { recursive: true })

  for (const file of fs.readdirSync(domainDir)) {
    if (!file.endsWith(".ts")) continue
    const source = fs.readFileSync(path.join(domainDir, file), "utf8")
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    })
    fs.writeFileSync(path.join(outDir, "domain", file.replace(/\.ts$/, ".js")), output.outputText)
  }
}

compileDomain()

const { calculateLegPayoff, calculateStrategyPayoff, calculateNetPremium } = require(path.join(outDir, "domain", "payoff-engine.js"))
const { calculateStrategyMetrics } = require(path.join(outDir, "domain", "metrics.js"))
const { validateLegs } = require(path.join(outDir, "domain", "validation.js"))
const { buildStrategyCandidates, defaultGoalFromStock } = require(path.join(outDir, "domain", "recommendation-engine.js"))
const { buildLiveRecommendations, selectModelExpiry } = require(path.join(outDir, "domain", "live-recommendation-engine.js"))
const { createModelDrafts, estimateVolatility, getModelAssumptions } = require(path.join(outDir, "domain", "model-pricing.js"))

function leg(overrides) {
  return {
    id: overrides.id || "leg",
    optionType: overrides.optionType || "call",
    side: overrides.side || "long",
    strike: overrides.strike ?? 100,
    premium: overrides.premium ?? 5,
    quantity: overrides.quantity ?? 1,
    lotSize: overrides.lotSize ?? 1,
    expiry: overrides.expiry || "2026-08-27",
  }
}

function futureExpiry(daysFromNow) {
  const date = new Date(Date.now() + daysFromNow * 86_400_000)
  return date.toISOString().slice(0, 10)
}

function contract(overrides) {
  return {
    contractSymbol: overrides.contractSymbol || `${overrides.optionType}-${overrides.strike}`,
    underlyingSymbol: "RELIANCE",
    underlyingPrice: overrides.underlyingPrice ?? 2450,
    exchange: "NSE",
    currency: "INR",
    expiry: overrides.expiry,
    strike: overrides.strike,
    optionType: overrides.optionType,
    bid: overrides.bid ?? 10,
    ask: overrides.ask ?? 10.5,
    lastPrice: overrides.lastPrice ?? 10.25,
    volume: overrides.volume ?? 1000,
    openInterest: overrides.openInterest ?? 5000,
    impliedVolatility: overrides.impliedVolatility ?? 18,
    delta: overrides.delta,
    gamma: null,
    theta: null,
    vega: null,
    quoteTimestamp: new Date().toISOString(),
    lotSize: overrides.lotSize ?? 250,
    liquidityScore: overrides.liquidityScore ?? 85,
  }
}

test("long call payoff covers below strike, at strike and above strike", () => {
  const call = leg({ optionType: "call", side: "long", strike: 100, premium: 5, lotSize: 10 })
  assert.equal(calculateLegPayoff(call, 90), -50)
  assert.equal(calculateLegPayoff(call, 100), -50)
  assert.equal(calculateLegPayoff(call, 110), 50)
})

test("long put payoff covers below strike, at strike and above strike", () => {
  const put = leg({ optionType: "put", side: "long", strike: 100, premium: 4, lotSize: 10 })
  assert.equal(calculateLegPayoff(put, 90), 60)
  assert.equal(calculateLegPayoff(put, 100), -40)
  assert.equal(calculateLegPayoff(put, 110), -40)
})

test("bull call spread max profit, max loss and breakeven are derived from engine", () => {
  const legs = [
    leg({ id: "long-lower-call", optionType: "call", side: "long", strike: 100, premium: 6, lotSize: 10 }),
    leg({ id: "short-higher-call", optionType: "call", side: "short", strike: 110, premium: 2, lotSize: 10 }),
  ]
  const metrics = calculateStrategyMetrics(legs, 104)
  assert.equal(calculateNetPremium(legs), -40)
  assert.equal(metrics.maxProfit, 60)
  assert.equal(metrics.maxLoss, -40)
  assert(metrics.breakevens.some((value) => Math.abs(value - 104) < 0.1))

  for (const price of [80, 100, 104, 108, 110, 125]) {
    const payoff = calculateStrategyPayoff(legs, price)
    assert(payoff <= metrics.maxProfit)
    assert(payoff >= metrics.maxLoss)
  }
})

test("bull put credit spread max loss equals width minus credit times lot and quantity", () => {
  const legs = [
    leg({ id: "long-lower-put", optionType: "put", side: "long", strike: 90, premium: 1, lotSize: 25 }),
    leg({ id: "short-higher-put", optionType: "put", side: "short", strike: 100, premium: 4, lotSize: 25 }),
  ]
  const metrics = calculateStrategyMetrics(legs, 102)
  assert.equal(calculateNetPremium(legs), 75)
  assert.equal(metrics.maxProfit, 75)
  assert.equal(metrics.maxLoss, -175)
})

test("long straddle has capped loss and uncapped upside profit", () => {
  const legs = [
    leg({ id: "long-call", optionType: "call", side: "long", strike: 100, premium: 5, lotSize: 1 }),
    leg({ id: "long-put", optionType: "put", side: "long", strike: 100, premium: 4, lotSize: 1 }),
  ]
  const metrics = calculateStrategyMetrics(legs, 100)
  assert.equal(metrics.maxProfit, null)
  assert.equal(metrics.maxLoss, -9)
  assert(metrics.breakevens.some((value) => Math.abs(value - 91) < 0.2))
  assert(metrics.breakevens.some((value) => Math.abs(value - 109) < 0.2))
})

test("iron condor validates ordering and caps risk", () => {
  const legs = [
    leg({ id: "long-lower-put", optionType: "put", side: "long", strike: 90, premium: 1 }),
    leg({ id: "short-higher-put", optionType: "put", side: "short", strike: 95, premium: 2 }),
    leg({ id: "short-lower-call", optionType: "call", side: "short", strike: 105, premium: 2 }),
    leg({ id: "long-higher-call", optionType: "call", side: "long", strike: 110, premium: 1 }),
  ]
  const issues = validateLegs(legs, "iron-condor", 100)
  assert.equal(issues.some((item) => item.severity === "error"), false)
  const metrics = calculateStrategyMetrics(legs, 100)
  assert.equal(metrics.maxProfit, 2)
  assert.equal(metrics.maxLoss, -3)
})

test("validation rejects missing values, mixed expiries and invalid ordering", () => {
  const legs = [
    leg({ id: "long-lower-call", optionType: "call", side: "long", strike: 110, premium: Number.NaN, expiry: "2026-08-27" }),
    leg({ id: "short-higher-call", optionType: "call", side: "short", strike: 100, premium: 2, expiry: "2026-09-24" }),
  ]
  const issues = validateLegs(legs, "bull-call-spread", 100)
  const codes = issues.map((item) => item.code)
  assert(codes.includes("long-lower-call-missing-premium"))
  assert(codes.includes("mixed-expiries"))
  assert(codes.includes("invalid-bull-call-order"))
})

test("decimal premiums, quantity and lot size are included in every graph point", () => {
  const legs = [
    leg({ id: "long-lower-call", optionType: "call", side: "long", strike: 100, premium: 3.5, quantity: 2, lotSize: 25 }),
    leg({ id: "short-higher-call", optionType: "call", side: "short", strike: 105, premium: 1.2, quantity: 2, lotSize: 25 }),
  ]
  const direct = calculateStrategyPayoff(legs, 105)
  assert.equal(direct, 135)
  const metrics = calculateStrategyMetrics(legs, 102)
  const closest = metrics.graphPoints.reduce((best, point) =>
    Math.abs(point.expiryPrice - 105) < Math.abs(best.expiryPrice - 105) ? point : best
  )
  assert(Math.abs(closest.payoff - direct) < 30)
})

test("strategy model adapts to bullish stock movement and balanced user goal", () => {
  const candidates = buildStrategyCandidates(
    { symbol: "RELIANCE", change: 1.23, technical: { signal: "BUY", overallScore: 62, rsi: 58, adx: 26 } },
    defaultGoalFromStock(1.23),
    "balanced"
  )
  assert.equal(candidates.length, 3)
  assert(["bull-call-spread", "bull-put-spread", "long-call"].includes(candidates[0].strategyId))
  assert(candidates[0].why.some((reason) => reason.includes("bullish")))
})

test("strategy model offers high risk high reward paths for big move goal", () => {
  const candidates = buildStrategyCandidates(
    { symbol: "TCS", change: 0.2, technical: { signal: "HOLD", overallScore: 51, rsi: 50, adx: 18 } },
    "big-move",
    "high-risk"
  )
  const ids = candidates.map((candidate) => candidate.strategyId)
  assert(ids.includes("long-straddle") || ids.includes("long-strangle"))
})

test("model pricing creates automated editable legs from stock context", () => {
  const expiry = getModelAssumptions(2450, 1.2, { signal: "BUY", overallScore: 64, rsi: 58, adx: 24 }, "").expiry
  const legs = createModelDrafts("bull-call-spread", 2450, 1.2, { signal: "BUY", overallScore: 64, rsi: 58, adx: 24 }, expiry)
  const assumptions = getModelAssumptions(2450, 1.2, { signal: "BUY", overallScore: 64, rsi: 58, adx: 24 }, expiry)

  assert.equal(legs.length, 2)
  assert(Number(legs[0].strike) < Number(legs[1].strike))
  assert(legs.every((item) => Number(item.premium) > 0))
  assert(legs.every((item) => item.lotSize === "100"))
  assert(assumptions.daysToExpiry > 0)
  assert(assumptions.annualVolatility >= 0.18)
  assert(estimateVolatility(3, { signal: "BUY", overallScore: 70, rsi: 68, adx: 35 }) > estimateVolatility(0, null))
})

test("live model selects expiry, strikes and execution-side premiums from option chain", () => {
  const expiries = [futureExpiry(7), futureExpiry(24), futureExpiry(45)]
  const expiry = selectModelExpiry(expiries, "upside", "balanced")
  const contracts = [
    contract({ expiry, optionType: "call", strike: 2450, delta: 0.52, bid: 42, ask: 43 }),
    contract({ expiry, optionType: "call", strike: 2500, delta: 0.3, bid: 21, ask: 22 }),
    contract({ expiry, optionType: "call", strike: 2600, delta: 0.14, bid: 8, ask: 8.5 }),
    contract({ expiry, optionType: "put", strike: 2400, delta: -0.34, bid: 24, ask: 25 }),
    contract({ expiry, optionType: "put", strike: 2350, delta: -0.18, bid: 12, ask: 13 }),
  ]

  const recommendations = buildLiveRecommendations({
    symbol: "RELIANCE",
    change: 1.2,
    spotPrice: 2450,
    expiries,
    contracts,
    goal: "upside",
    risk: "balanced",
    technical: { signal: "BUY", overallScore: 64, rsi: 58, adx: 24 },
    provider: "DhanHQ",
  })

  assert(recommendations.length > 0)
  assert.equal(recommendations[0].expiry, expiry)
  assert(recommendations[0].legs.every((item) => item.premium > 0))
  assert(recommendations[0].metrics)
})
