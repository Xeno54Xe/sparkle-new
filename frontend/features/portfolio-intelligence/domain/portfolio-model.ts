// Portfolio maths for the Portfolio page.
//
// Prices are live quotes (or the bundled snapshot until they load). Everything
// that needs history (factor scores, beta, volatility, alpha, Sharpe,
// correlations, pairs) comes from the backend's /portfolio/analytics, which
// computes it from a year of real daily prices and published fundamentals.
// Until that data arrives those fields are null and the page says so; nothing
// here is simulated.
import { demoStocks as nifty50Stocks, type DemoStock as Stock } from "@/lib/demo-prices"

const TRADING_DAYS = 252

export type HoldingInput = {
  symbol: string
  quantity: number
  averagePrice: number
}

export const FACTOR_KEYS = ["momentum", "value", "size", "quality", "lowVolatility"] as const
export type FactorKey = (typeof FACTOR_KEYS)[number]
export type FactorScores = Record<FactorKey, number | null>

export type StockAnalytics = {
  sector: string | null
  ret_1y: number
  vol: number
  beta: number
  alpha: number
  momentum_12_1: number | null
  pe: number | null
  pb: number | null
  roe: number | null
  debt_to_equity: number | null
  market_cap: number | null
  factors: FactorScores
}

export type PairAnalytics = {
  pair: string
  left: string
  right: string
  sector: string
  hedge_ratio: number
  adf_t: number
  significance: "1%" | "5%" | "10%" | null
  half_life: number | null
  correlation: number | null
  z: number
  signal: string
  points: Array<{ date: string; z: number }>
}

export type MarketAnalytics = {
  as_of: string
  start: string
  days: number
  risk_free: number
  benchmark: { symbol: string; name: string; ret_1y: number; vol: number }
  dates: string[]
  benchmark_returns: number[]
  returns: Record<string, number[]>
  stocks: Record<string, StockAnalytics>
  pairs: PairAnalytics[]
  pairs_tested: number
  methodology: Record<string, string>
}

/** Accept a /portfolio/analytics payload only if it has the shape the maths needs. */
export function isMarketAnalytics(data: unknown): data is MarketAnalytics {
  const d = data as MarketAnalytics | null
  return Boolean(
    d &&
      typeof d === "object" &&
      Array.isArray(d.dates) &&
      Array.isArray(d.benchmark_returns) &&
      d.benchmark_returns.length === d.dates.length &&
      d.dates.length > 20 &&
      d.returns && typeof d.returns === "object" &&
      d.stocks && typeof d.stocks === "object" &&
      Array.isArray(d.pairs)
  )
}

export type HoldingAnalysis = HoldingInput & {
  stock: Stock
  value: number
  weight: number
  pnl: number
  pnlPct: number
  analytics: StockAnalytics | null
  theme: string
}

export type RiskMetrics = {
  /** Return over the past year had today's weights been held throughout (annualised). */
  annualReturn: number
  benchmarkReturn: number
  excessReturn: number
  volatility: number
  benchmarkVolatility: number
  beta: number
  /** Jensen's alpha, annualised, against the benchmark. */
  alpha: number
  sharpe: number
  maxDrawdown: number
  /** Weighted average stock volatility divided by portfolio volatility; above 1 means correlation is helping. */
  diversificationRatio: number
  /** Share of portfolio value that has a year of history behind these numbers. */
  coveredWeight: number
  riskFree: number
}

export type PortfolioSummary = {
  holdings: HoldingAnalysis[]
  totalValue: number
  totalCost: number
  pnl: number
  pnlPct: number
  dayChangePct: number
  /** Herfindahl index of weights, in percent. */
  concentration: number
  /** 1 / Herfindahl: how many equal-sized holdings this is equivalent to. */
  effectiveStocks: number
  factorTilt: FactorScores
  risk: RiskMetrics | null
  mostCorrelated: { pair: string; correlation: number } | null
  sectorWeights: Array<{ sector: string; weight: number; value: number }>
  themes: Array<{ theme: string; weight: number }>
  topContributors: HoldingAnalysis[]
  notes: string[]
}

// A label per sector for grouping, not a score.
const sectorThemes: Record<string, string> = {
  Banking: "Credit growth",
  Finance: "Consumer credit",
  Insurance: "Financial penetration",
  IT: "AI and digital services",
  FMCG: "Consumption premiumization",
  Pharma: "Healthcare resilience",
  Healthcare: "Healthcare access",
  Automobile: "Mobility and EV adoption",
  Energy: "Energy transition",
  Power: "Electrification",
  Infrastructure: "India capex",
  Metals: "Industrial cycle",
  Cement: "Housing and capex",
  Telecom: "Digital penetration",
  Mining: "Commodity security",
  Conglomerate: "Multi-theme exposure",
  "Consumer Goods": "Discretionary consumption",
}

function mean(xs: number[]) {
  return xs.reduce((sum, x) => sum + x, 0) / xs.length
}

function covariance(a: number[], b: number[]) {
  const ma = mean(a)
  const mb = mean(b)
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - ma) * (b[i] - mb)
  return sum / (a.length - 1)
}

function stdev(xs: number[]) {
  return Math.sqrt(covariance(xs, xs))
}

function annualise(daily: number[]) {
  const growth = daily.reduce((g, r) => g * (1 + r), 1)
  return growth > 0 ? growth ** (TRADING_DAYS / daily.length) - 1 : Number.NaN
}

function maxDrawdown(daily: number[]) {
  let level = 1
  let peak = 1
  let worst = 0
  for (const r of daily) {
    level *= 1 + r
    peak = Math.max(peak, level)
    worst = Math.min(worst, level / peak - 1)
  }
  return worst
}

/** Risk and return of the portfolio over the past year, holding today's weights. */
export function portfolioRisk(holdings: HoldingAnalysis[], analytics: MarketAnalytics): RiskMetrics | null {
  const covered = holdings.filter((h) => h.weight > 0 && analytics.returns[h.symbol]?.length === analytics.dates.length)
  const coveredWeight = covered.reduce((sum, h) => sum + h.weight, 0)
  if (!covered.length || coveredWeight <= 0) return null

  const bench = analytics.benchmark_returns
  const days = bench.length
  const port = new Array<number>(days).fill(0)
  for (const h of covered) {
    const w = h.weight / coveredWeight
    const series = analytics.returns[h.symbol]
    for (let t = 0; t < days; t += 1) port[t] += w * series[t]
  }

  const rf = analytics.risk_free
  const rfDaily = (1 + rf) ** (1 / TRADING_DAYS) - 1
  const volDaily = stdev(port)
  const benchVar = covariance(bench, bench)
  const beta = benchVar > 0 ? covariance(port, bench) / benchVar : Number.NaN
  const alphaDaily = mean(port.map((r) => r - rfDaily)) - beta * mean(bench.map((r) => r - rfDaily))
  const annualReturn = annualise(port)
  const benchmarkReturn = annualise(bench)
  const volatility = volDaily * Math.sqrt(TRADING_DAYS)
  const weightedStockVol = covered.reduce(
    (sum, h) => sum + (h.weight / coveredWeight) * stdev(analytics.returns[h.symbol]) * Math.sqrt(TRADING_DAYS),
    0
  )

  return {
    annualReturn,
    benchmarkReturn,
    excessReturn: annualReturn - benchmarkReturn,
    volatility,
    benchmarkVolatility: stdev(bench) * Math.sqrt(TRADING_DAYS),
    beta,
    alpha: (1 + alphaDaily) ** TRADING_DAYS - 1,
    sharpe: volatility > 0 ? (annualReturn - rf) / volatility : Number.NaN,
    maxDrawdown: maxDrawdown(port),
    diversificationRatio: volatility > 0 ? weightedStockVol / volatility : Number.NaN,
    coveredWeight,
    riskFree: rf,
  }
}

function weightedFactor(holdings: HoldingAnalysis[], key: FactorKey): number | null {
  let sum = 0
  let weight = 0
  for (const h of holdings) {
    const score = h.analytics?.factors[key]
    if (score == null || h.weight <= 0) continue
    sum += score * h.weight
    weight += h.weight
  }
  return weight > 0 ? sum / weight : null
}

function mostCorrelatedPair(holdings: HoldingAnalysis[], analytics: MarketAnalytics) {
  let best: { pair: string; correlation: number } | null = null
  const withData = holdings.filter((h) => h.weight > 0 && analytics.returns[h.symbol])
  for (let i = 0; i < withData.length; i += 1) {
    for (let j = i + 1; j < withData.length; j += 1) {
      const a = analytics.returns[withData[i].symbol]
      const b = analytics.returns[withData[j].symbol]
      const corr = covariance(a, b) / (stdev(a) * stdev(b))
      if (Number.isFinite(corr) && (!best || corr > best.correlation)) {
        best = { pair: `${withData[i].symbol}/${withData[j].symbol}`, correlation: corr }
      }
    }
  }
  return best
}

function summarizeBy<T extends string>(holdings: HoldingAnalysis[], key: (holding: HoldingAnalysis) => T) {
  const map = new Map<T, { value: number; weight: number }>()
  holdings.forEach((holding) => {
    const id = key(holding)
    const current = map.get(id) ?? { value: 0, weight: 0 }
    current.value += holding.value
    current.weight += holding.weight
    map.set(id, current)
  })
  return [...map.entries()]
    .map(([label, item]) => ({ label, ...item }))
    .sort((a, b) => b.weight - a.weight)
}

const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`

function buildNotes(summary: Omit<PortfolioSummary, "notes">, analytics: MarketAnalytics | null): string[] {
  const notes: string[] = []
  const { risk, factorTilt, sectorWeights, effectiveStocks, mostCorrelated } = summary
  const top = sectorWeights[0]

  if (top && top.weight > 0.35) notes.push(`${top.sector} is ${pct(top.weight)} of the portfolio; one sector drives most of the outcome.`)
  if (summary.holdings.length > 1 && effectiveStocks < 5) {
    notes.push(`Weights make this behave like ${effectiveStocks.toFixed(1)} equal-sized holdings; a few positions dominate.`)
  }
  if (!analytics || !risk) {
    notes.push("Risk notes based on price history appear once a year of market data has loaded.")
    return notes.slice(0, 5)
  }
  if (risk.beta > 1.2) notes.push(`Beta ${risk.beta.toFixed(2)}: over the past year the portfolio moved about ${risk.beta.toFixed(1)}x as much as the Nifty 50.`)
  else if (risk.beta < 0.8) notes.push(`Beta ${risk.beta.toFixed(2)}: more defensive than the Nifty 50; expect to lag in strong rallies.`)
  if (risk.volatility > risk.benchmarkVolatility * 1.25) {
    notes.push(`Volatility ${pct(risk.volatility, 1)} is well above the Nifty 50's ${pct(risk.benchmarkVolatility, 1)}.`)
  }
  if (risk.maxDrawdown < -0.2) notes.push(`At today's weights the worst fall in the past year was ${pct(risk.maxDrawdown, 1)} from a peak.`)
  if (mostCorrelated && mostCorrelated.correlation > 0.75) {
    notes.push(`${mostCorrelated.pair.replace("/", " and ")} moved together (correlation ${mostCorrelated.correlation.toFixed(2)}); they diversify each other little.`)
  }
  if (factorTilt.momentum != null && factorTilt.momentum < 30) notes.push("Holdings rank low on 12-month momentum: most have lagged the rest of the Nifty 50.")
  if (factorTilt.value != null && factorTilt.value < 35) notes.push("Holdings rank expensive on earnings and book yield compared with other Nifty 50 stocks.")
  if (factorTilt.quality != null && factorTilt.quality < 35) notes.push("Holdings rank low on quality (return on equity and leverage).")
  if (risk.coveredWeight < 0.999) notes.push(`${pct(1 - risk.coveredWeight)} of the value lacks a full year of history and is left out of the risk figures.`)
  if (!notes.length) notes.push("No concentration, beta, volatility or factor extremes stand out; sizing and entry discipline matter most now.")
  return notes.slice(0, 5)
}

/**
 * Prices default to the bundled snapshot; pass live quotes as `universe`.
 * Pass the /portfolio/analytics payload as `analytics` for factor and risk figures.
 */
export function analyzePortfolio(
  inputs: HoldingInput[],
  universe: Stock[] = nifty50Stocks,
  analytics: MarketAnalytics | null = null
): PortfolioSummary {
  const valid = inputs
    .map((input) => ({ input, stock: universe.find((stock) => stock.symbol === input.symbol) }))
    .filter((item): item is { input: HoldingInput; stock: Stock } => Boolean(item.stock) && item.input.quantity > 0)

  const totalValue = valid.reduce((sum, item) => sum + item.stock.price * item.input.quantity, 0)
  const totalCost = valid.reduce((sum, item) => sum + item.input.averagePrice * item.input.quantity, 0)
  const holdings: HoldingAnalysis[] = valid.map(({ input, stock }) => {
    const value = stock.price * input.quantity
    const cost = input.averagePrice * input.quantity
    return {
      ...input,
      stock,
      value,
      weight: totalValue > 0 ? value / totalValue : 0,
      pnl: value - cost,
      pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      analytics: analytics?.stocks[stock.symbol] ?? null,
      theme: sectorThemes[stock.sector] ?? "Core equity",
    }
  })

  const herfindahl = holdings.reduce((sum, h) => sum + h.weight * h.weight, 0)
  const factorTilt = Object.fromEntries(FACTOR_KEYS.map((k) => [k, weightedFactor(holdings, k)])) as FactorScores
  const base = {
    holdings,
    totalValue,
    totalCost,
    pnl: totalValue - totalCost,
    pnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    dayChangePct: holdings.reduce((sum, h) => sum + h.stock.change * h.weight, 0),
    concentration: Number((herfindahl * 100).toFixed(1)),
    effectiveStocks: herfindahl > 0 ? Number((1 / herfindahl).toFixed(1)) : 0,
    factorTilt,
    risk: analytics ? portfolioRisk(holdings, analytics) : null,
    mostCorrelated: analytics ? mostCorrelatedPair(holdings, analytics) : null,
    sectorWeights: summarizeBy(holdings, (h) => h.stock.sector).map((item) => ({ sector: item.label, weight: item.weight, value: item.value })),
    themes: summarizeBy(holdings, (h) => h.theme).map((item) => ({ theme: item.label, weight: item.weight })),
    topContributors: [...holdings].sort((a, b) => b.pnl - a.pnl).slice(0, 4),
  }
  return { ...base, notes: buildNotes(base, analytics) }
}

/**
 * Rebase holdings' average prices from the snapshot to live prices, keeping
 * each holding's gain or loss in percent. Used for the sample portfolio so
 * its P&L stays realistic once live quotes arrive.
 */
export function rebaseToLivePrices(inputs: HoldingInput[], live: Stock[]): HoldingInput[] {
  return inputs.map((input) => {
    const before = nifty50Stocks.find((stock) => stock.symbol === input.symbol)
    const now = live.find((stock) => stock.symbol === input.symbol)
    if (!before || !now || !(before.price > 0)) return input
    return { ...input, averagePrice: Math.round(input.averagePrice * (now.price / before.price) * 100) / 100 }
  })
}

export const samplePortfolio: HoldingInput[] = [
  { symbol: "RELIANCE", quantity: 8, averagePrice: 2320 },
  { symbol: "HDFCBANK", quantity: 14, averagePrice: 1585 },
  { symbol: "INFY", quantity: 10, averagePrice: 1610 },
  { symbol: "LT", quantity: 5, averagePrice: 3210 },
  { symbol: "ITC", quantity: 42, averagePrice: 430 },
  { symbol: "SUNPHARMA", quantity: 12, averagePrice: 1040 },
]
