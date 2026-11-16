/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const root = path.resolve(__dirname, "..")
const outDir = path.join(os.tmpdir(), "sparkle-portfolio-intelligence-tests")
const sourceFile = path.join(root, "domain", "portfolio-model.ts")
const libDir = path.resolve(root, "..", "..", "lib")
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }

function transpile(from, to) {
  const source = fs.readFileSync(from, "utf8").replace(/@\/lib\//g, "../lib/")
  fs.writeFileSync(to, ts.transpileModule(source, { compilerOptions }).outputText)
}

function compile() {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, "domain"), { recursive: true })
  fs.mkdirSync(path.join(outDir, "lib"), { recursive: true })

  fs.copyFileSync(path.join(libDir, "nifty50.json"), path.join(outDir, "lib", "nifty50.json"))
  transpile(path.join(libDir, "stocks.ts"), path.join(outDir, "lib", "stocks.js"))
  transpile(path.join(libDir, "demo-prices.ts"), path.join(outDir, "lib", "demo-prices.js"))
  transpile(sourceFile, path.join(outDir, "domain", "portfolio-model.js"))
}

compile()

const {
  analyzePortfolio,
  isMarketAnalytics,
  portfolioRisk,
  samplePortfolio,
} = require(path.join(outDir, "domain", "portfolio-model.js"))
const { demoStocks: nifty50Stocks } = require(path.join(outDir, "lib", "demo-prices.js"))

const close = (a, b, tol = 1e-6) => assert(Math.abs(a - b) <= tol, `${a} != ${b}`)

// A small, exactly known market: the index alternates +1% / -0.5%; RELIANCE
// returns exactly 2x the index, HDFCBANK exactly the index, INFY its mirror.
function fixture() {
  const days = 252
  const bench = Array.from({ length: days }, (_, t) => (t % 2 === 0 ? 0.01 : -0.005))
  const scale = (k) => bench.map((r) => r * k)
  const stock = (factors, alpha = 0) => ({
    sector: null, ret_1y: 0, vol: 0.2, beta: 1, alpha, momentum_12_1: 0, pe: 20, pb: 3, roe: 15,
    debt_to_equity: 10, market_cap: 1e12, factors,
  })
  return {
    as_of: "2026-11-13",
    start: "2025-11-13",
    days,
    risk_free: 0,
    benchmark: { symbol: "^NSEI", name: "Nifty 50", ret_1y: 0, vol: 0.1 },
    dates: Array.from({ length: days }, (_, t) => `d${t}`),
    benchmark_returns: bench,
    returns: { RELIANCE: scale(2), HDFCBANK: scale(1), INFY: scale(-1) },
    stocks: {
      RELIANCE: stock({ momentum: 80, value: 20, size: 100, quality: null, lowVolatility: 10 }),
      HDFCBANK: stock({ momentum: 40, value: 60, size: 90, quality: 50, lowVolatility: 70 }),
      INFY: stock({ momentum: 0, value: 0, size: 0, quality: 0, lowVolatility: 0 }),
    },
    pairs: [],
    pairs_tested: 0,
    methodology: {},
  }
}

function priceOf(symbol) {
  return nifty50Stocks.find((s) => s.symbol === symbol).price
}

// Two holdings of equal value, so each weight is exactly 0.5.
function equalHoldings(a, b) {
  return [
    { symbol: a, quantity: 1, averagePrice: priceOf(a) },
    { symbol: b, quantity: priceOf(a) / priceOf(b), averagePrice: priceOf(b) },
  ]
}

test("without market history: prices and P/L are real, everything historical is blank", () => {
  const summary = analyzePortfolio(samplePortfolio)
  assert(summary.totalValue > 0)
  assert.equal(summary.holdings.length, samplePortfolio.length)
  assert.equal(summary.risk, null)
  assert.equal(summary.mostCorrelated, null)
  Object.values(summary.factorTilt).forEach((v) => assert.equal(v, null))
  assert(summary.holdings.every((h) => h.analytics === null))
  assert(summary.notes.some((n) => n.includes("year of market data")))
  assert(summary.effectiveStocks > 1)
})

test("beta, alpha and returns follow from the daily returns", () => {
  const summary = analyzePortfolio(equalHoldings("RELIANCE", "HDFCBANK"), nifty50Stocks, fixture())
  const risk = summary.risk
  close(risk.beta, 1.5)           // 0.5 * 2 + 0.5 * 1
  close(risk.alpha, 0, 1e-9)      // returns are exactly beta x index, risk-free 0
  close(risk.coveredWeight, 1)
  // portfolio daily return is exactly 1.5x the index, so compounding gives this
  const expected = (1.015 ** 126) * (0.9925 ** 126) - 1
  close(risk.annualReturn, expected, 1e-9)
  close(risk.excessReturn, risk.annualReturn - risk.benchmarkReturn, 1e-12)
  close(risk.maxDrawdown, -0.0075, 1e-9)  // worst fall is one down day
  assert(risk.volatility > risk.benchmarkVolatility)
})

test("a perfect hedge has no volatility and diversification shows it", () => {
  const risk = analyzePortfolio(equalHoldings("HDFCBANK", "INFY"), nifty50Stocks, fixture()).risk
  close(risk.volatility, 0, 1e-12)
  close(risk.beta, 0, 1e-12)
})

test("factor tilt is value-weighted and skips missing scores", () => {
  const summary = analyzePortfolio(equalHoldings("RELIANCE", "HDFCBANK"), nifty50Stocks, fixture())
  close(summary.factorTilt.momentum, 60)  // (80 + 40) / 2
  close(summary.factorTilt.quality, 50)   // RELIANCE has none, so HDFCBANK alone
  assert.equal(summary.mostCorrelated.pair, "RELIANCE/HDFCBANK")
  close(summary.mostCorrelated.correlation, 1, 1e-9)
  assert(summary.notes.some((n) => n.includes("moved together")))
})

test("holdings without history are left out of risk and reported", () => {
  const data = fixture()
  delete data.returns.HDFCBANK
  const risk = portfolioRisk(analyzePortfolio(equalHoldings("RELIANCE", "HDFCBANK"), nifty50Stocks, data).holdings, data)
  close(risk.coveredWeight, 0.5)
  close(risk.beta, 2)
})

test("analytics payloads are validated before use", () => {
  assert(isMarketAnalytics(fixture()))
  assert(!isMarketAnalytics(null))
  assert(!isMarketAnalytics({ error: "No price history" }))
  const bad = fixture()
  bad.benchmark_returns = bad.benchmark_returns.slice(1)
  assert(!isMarketAnalytics(bad))
})
