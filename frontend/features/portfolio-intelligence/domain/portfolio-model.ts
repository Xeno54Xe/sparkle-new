import { nifty50Stocks, type Stock } from "@/lib/stocks"

export type HoldingInput = {
  symbol: string
  quantity: number
  averagePrice: number
}

export type FactorScores = {
  momentum: number
  value: number
  size: number
  quality: number
  lowVolatility: number
  esg: number
  alpha: number
  penetration: number
}

export type HoldingAnalysis = HoldingInput & {
  stock: Stock
  value: number
  weight: number
  pnl: number
  pnlPct: number
  factors: FactorScores
  theme: string
}

export type PortfolioSummary = {
  holdings: HoldingAnalysis[]
  totalValue: number
  totalCost: number
  pnl: number
  pnlPct: number
  dayChangePct: number
  estimatedAlpha: number
  beta: number
  volatility: number
  sharpeLike: number
  concentrationRisk: number
  effectiveStocks: number
  factorTilt: FactorScores
  sectorWeights: Array<{ sector: string; weight: number; value: number }>
  themes: Array<{ theme: string; weight: number }>
  topContributors: HoldingAnalysis[]
  rebalanceNotes: string[]
}

export type PairCandidate = {
  pair: string
  left: Stock
  right: Stock
  correlation: number
  zScore: number
  spread: number
  signal: string
  confidence: number
  points: Array<{ day: string; spread: number; mean: number; upper: number; lower: number }>
}

const sectorQuality: Record<string, number> = {
  Banking: 72,
  Finance: 68,
  Insurance: 66,
  IT: 78,
  FMCG: 76,
  Pharma: 73,
  Healthcare: 74,
  Automobile: 65,
  Energy: 58,
  Power: 62,
  Infrastructure: 64,
  Metals: 54,
  Cement: 61,
  Telecom: 67,
  Mining: 48,
  Conglomerate: 56,
  "Consumer Goods": 70,
}

const sectorEsg: Record<string, number> = {
  Banking: 69,
  Finance: 66,
  Insurance: 70,
  IT: 78,
  FMCG: 72,
  Pharma: 68,
  Healthcare: 74,
  Automobile: 59,
  Energy: 44,
  Power: 55,
  Infrastructure: 58,
  Metals: 45,
  Cement: 48,
  Telecom: 64,
  Mining: 39,
  Conglomerate: 50,
  "Consumer Goods": 71,
}

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

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function stableNoise(symbol: string, scale = 1) {
  const seed = symbol.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0)
  return (Math.sin(seed) + Math.cos(seed * 0.7)) * scale
}

function percentileRank(value: number, values: number[], highIsGood = true) {
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.findIndex((item) => item >= value)
  const pct = rank < 0 ? 100 : (rank / Math.max(sorted.length - 1, 1)) * 100
  return Math.round(highIsGood ? pct : 100 - pct)
}

export function scoreStockFactors(stock: Stock): FactorScores {
  const prices = nifty50Stocks.map((item) => item.price)
  const sector = stock.sector
  const momentum = clamp(50 + stock.change * 12 + stableNoise(stock.symbol, 4))
  const value = clamp(percentileRank(stock.price, prices, false) * 0.65 + (sectorQuality[sector] ?? 60) * 0.35)
  const size = clamp(percentileRank(stock.price, prices, true) * 0.85 + 10 + stableNoise(stock.symbol, 3))
  const quality = clamp((sectorQuality[sector] ?? 60) + Math.max(-8, Math.min(8, stock.change * 2)) + stableNoise(stock.symbol, 3))
  const lowVolatility = clamp(82 - Math.abs(stock.change) * 13 + stableNoise(stock.symbol, 3))
  const esg = clamp((sectorEsg[sector] ?? 58) + stableNoise(stock.symbol, 5))
  const alpha = clamp(momentum * 0.35 + quality * 0.25 + value * 0.2 + lowVolatility * 0.1 + esg * 0.1)
  const penetration = clamp((sectorThemes[sector] ? 62 : 50) + stock.change * 3 + stableNoise(stock.symbol, 6))

  return { momentum, value, size, quality, lowVolatility, esg, alpha, penetration }
}

function weightedAverage(holdings: HoldingAnalysis[], key: keyof FactorScores) {
  return holdings.reduce((sum, holding) => sum + holding.factors[key] * holding.weight, 0)
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

export function analyzePortfolio(inputs: HoldingInput[]): PortfolioSummary {
  const valid = inputs
    .map((input) => ({ input, stock: nifty50Stocks.find((stock) => stock.symbol === input.symbol) }))
    .filter((item): item is { input: HoldingInput; stock: Stock } => Boolean(item.stock) && item.input.quantity > 0)

  const totalValue = valid.reduce((sum, item) => sum + item.stock.price * item.input.quantity, 0)
  const totalCost = valid.reduce((sum, item) => sum + item.input.averagePrice * item.input.quantity, 0)
  const holdings = valid.map(({ input, stock }) => {
    const value = stock.price * input.quantity
    const cost = input.averagePrice * input.quantity
    return {
      ...input,
      stock,
      value,
      weight: totalValue > 0 ? value / totalValue : 0,
      pnl: value - cost,
      pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      factors: scoreStockFactors(stock),
      theme: sectorThemes[stock.sector] ?? "Core equity",
    }
  })

  const dayChangePct = holdings.reduce((sum, holding) => sum + holding.stock.change * holding.weight, 0)
  const factorTilt: FactorScores = {
    momentum: weightedAverage(holdings, "momentum"),
    value: weightedAverage(holdings, "value"),
    size: weightedAverage(holdings, "size"),
    quality: weightedAverage(holdings, "quality"),
    lowVolatility: weightedAverage(holdings, "lowVolatility"),
    esg: weightedAverage(holdings, "esg"),
    alpha: weightedAverage(holdings, "alpha"),
    penetration: weightedAverage(holdings, "penetration"),
  }
  const concentrationRisk = holdings.reduce((sum, holding) => sum + holding.weight * holding.weight, 0)
  const effectiveStocks = concentrationRisk > 0 ? 1 / concentrationRisk : 0
  const beta = clamp(0.78 + factorTilt.momentum / 220 + (100 - factorTilt.lowVolatility) / 260, 0.6, 1.65)
  const volatility = clamp(10 + (100 - factorTilt.lowVolatility) * 0.22 + concentrationRisk * 18, 8, 38)
  const estimatedAlpha = Number(((factorTilt.alpha - 55) / 4 + dayChangePct * 0.18).toFixed(2))
  const sharpeLike = Number(((estimatedAlpha + 7) / Math.max(volatility, 1)).toFixed(2))
  const sectorWeights = summarizeBy(holdings, (holding) => holding.stock.sector).map((item) => ({
    sector: item.label,
    weight: item.weight,
    value: item.value,
  }))
  const themes = summarizeBy(holdings, (holding) => holding.theme).map((item) => ({
    theme: item.label,
    weight: item.weight,
  }))
  const topContributors = [...holdings].sort((a, b) => b.pnl - a.pnl).slice(0, 4)
  const rebalanceNotes = buildRebalanceNotes(factorTilt, sectorWeights, effectiveStocks)

  return {
    holdings,
    totalValue,
    totalCost,
    pnl: totalValue - totalCost,
    pnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    dayChangePct,
    estimatedAlpha,
    beta: Number(beta.toFixed(2)),
    volatility: Number(volatility.toFixed(1)),
    sharpeLike,
    concentrationRisk: Number((concentrationRisk * 100).toFixed(1)),
    effectiveStocks: Number(effectiveStocks.toFixed(1)),
    factorTilt,
    sectorWeights,
    themes,
    topContributors,
    rebalanceNotes,
  }
}

function buildRebalanceNotes(factors: FactorScores, sectors: Array<{ sector: string; weight: number }>, effectiveStocks: number) {
  const notes: string[] = []
  const topSector = sectors[0]
  if (topSector && topSector.weight > 0.35) notes.push(`Reduce ${topSector.sector} concentration or offset it with a less-correlated sector.`)
  if (factors.value < 52) notes.push("Add more value exposure to balance momentum-heavy positioning.")
  if (factors.esg < 58) notes.push("ESG score is below the model comfort zone; consider higher ESG sectors or leaders.")
  if (factors.lowVolatility < 55) notes.push("Portfolio volatility is elevated; add steadier compounders or reduce high-beta names.")
  if (effectiveStocks < 5) notes.push("Effective diversification is low; portfolio behaves like fewer stocks than the holding count suggests.")
  if (!notes.length) notes.push("Portfolio looks balanced across factors; focus next on sizing and entry discipline.")
  return notes.slice(0, 4)
}

function syntheticReturns(stock: Stock, days = 90) {
  const sectorBias = (sectorQuality[stock.sector] ?? 60) / 1000
  return Array.from({ length: days }, (_, index) => {
    const wave = Math.sin((index + 1) * 0.17 + stableNoise(stock.symbol, 0.5)) * 0.009
    const cycle = Math.cos((index + 1) * 0.07 + stock.symbol.length) * 0.006
    const drift = stock.change / 100 / 18 + sectorBias
    return drift + wave + cycle + stableNoise(`${stock.symbol}-${index}`, 0.002)
  })
}

function correlation(left: number[], right: number[]) {
  const n = Math.min(left.length, right.length)
  const l = left.slice(0, n)
  const r = right.slice(0, n)
  const meanL = l.reduce((sum, value) => sum + value, 0) / n
  const meanR = r.reduce((sum, value) => sum + value, 0) / n
  const cov = l.reduce((sum, value, index) => sum + (value - meanL) * (r[index] - meanR), 0)
  const sdL = Math.sqrt(l.reduce((sum, value) => sum + (value - meanL) ** 2, 0))
  const sdR = Math.sqrt(r.reduce((sum, value) => sum + (value - meanR) ** 2, 0))
  return sdL && sdR ? cov / (sdL * sdR) : 0
}

export function findPairCandidates(limit = 6): PairCandidate[] {
  const candidates: PairCandidate[] = []
  for (let i = 0; i < nifty50Stocks.length; i += 1) {
    for (let j = i + 1; j < nifty50Stocks.length; j += 1) {
      const left = nifty50Stocks[i]
      const right = nifty50Stocks[j]
      if (left.sector !== right.sector) continue
      const leftReturns = syntheticReturns(left)
      const rightReturns = syntheticReturns(right)
      const corr = correlation(leftReturns, rightReturns)
      const spreadPoints = leftReturns.map((value, index) => value - rightReturns[index])
      const mean = spreadPoints.reduce((sum, value) => sum + value, 0) / spreadPoints.length
      const sd = Math.sqrt(spreadPoints.reduce((sum, value) => sum + (value - mean) ** 2, 0) / spreadPoints.length) || 0.001
      const spread = spreadPoints.at(-1) ?? 0
      const zScore = (spread - mean) / sd
      const absZ = Math.abs(zScore)
      const signal = absZ < 1
        ? "Watch only"
        : zScore > 0
          ? `Long ${right.symbol}, short ${left.symbol}`
          : `Long ${left.symbol}, short ${right.symbol}`
      const points = spreadPoints.slice(-45).map((item, index) => ({
        day: `D-${44 - index}`,
        spread: Number((item * 100).toFixed(2)),
        mean: Number((mean * 100).toFixed(2)),
        upper: Number(((mean + sd * 1.5) * 100).toFixed(2)),
        lower: Number(((mean - sd * 1.5) * 100).toFixed(2)),
      }))
      candidates.push({
        pair: `${left.symbol}/${right.symbol}`,
        left,
        right,
        correlation: Number(corr.toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        spread: Number((spread * 100).toFixed(2)),
        signal,
        confidence: clamp(corr * 70 + Math.min(absZ, 2.5) * 12),
        points,
      })
    }
  }
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export const samplePortfolio: HoldingInput[] = [
  { symbol: "RELIANCE", quantity: 8, averagePrice: 2320 },
  { symbol: "HDFCBANK", quantity: 14, averagePrice: 1585 },
  { symbol: "INFY", quantity: 10, averagePrice: 1610 },
  { symbol: "LT", quantity: 5, averagePrice: 3210 },
  { symbol: "ITC", quantity: 42, averagePrice: 430 },
  { symbol: "SUNPHARMA", quantity: 12, averagePrice: 1040 },
]
