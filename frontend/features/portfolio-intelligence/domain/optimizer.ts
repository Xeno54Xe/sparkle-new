// Long-only portfolio optimiser for the Portfolio page.
//
// Inputs are a year of real daily returns (from /portfolio/analytics) and,
// optionally, one Sparkle conviction score per stock (from /portfolio/views).
// Everything runs in the browser: the universe is at most fifty stocks.
//
//   Risk:     sample covariance, annualised, shrunk toward its diagonal so a
//             single year of data doesn't produce extreme weights.
//   Returns:  market-implied (reverse optimisation from market caps), the same
//             tilted by Sparkle views through Black-Litterman, or the raw
//             trailing-year mean for comparison.
//   Weights:  max Sharpe, min variance or risk parity, long only, each stock
//             capped, plus the efficient frontier those sit on.

export const TRADING_DAYS = 252
/** Weight on the diagonal target when shrinking the sample covariance. */
export const SHRINKAGE = 0.2
/** Market risk aversion used to back out implied returns (He and Litterman's 2.5). */
export const RISK_AVERSION = 2.5
/** Black-Litterman tau: how uncertain the equilibrium returns are, relative to the covariance. */
export const TAU = 0.05
/** A stock scored one standard deviation above its peers is expected to beat its equilibrium return by this share of its own volatility a year. */
export const VIEW_SCALE = 0.1

export type ReturnModel = "blackLitterman" | "equilibrium" | "historical"
export type Objective = "maxSharpe" | "minVariance" | "riskParity"

export type SparkleView = {
  score: number
  coverage: number
  sources: Array<{ source: string; period: string; score: number; label?: string | null }>
}

export type PortfolioPoint = {
  weights: number[]
  ret: number
  vol: number
  sharpe: number
}

export type OptimizerInput = {
  symbols: string[]
  /** Daily simple returns, one array per symbol, all the same length. */
  returns: number[][]
  /** Market capitalisation per symbol; missing ones get the average. */
  marketCaps: Array<number | null>
  riskFree: number
  views?: Record<string, SparkleView>
  /** 0 = ignore the views, 1 = default, 2 = twice as confident. */
  viewConfidence?: number
  model: ReturnModel
  objective: Objective
  /** Maximum weight in any one stock, 0-1. Raised to 1/n if lower. */
  cap: number
  /** Current portfolio weights, same order as symbols, for comparison. */
  current?: number[]
}

export type OptimizerResult = {
  symbols: string[]
  model: ReturnModel
  objective: Objective
  cap: number
  expected: number[]
  equilibrium: number[]
  volatility: number[]
  optimal: PortfolioPoint
  riskContribution: number[]
  current: PortfolioPoint | null
  frontier: PortfolioPoint[]
  viewsUsed: number
}

// ---------- small linear algebra ----------

type Matrix = number[][]

function matVec(A: Matrix, x: number[]) {
  return A.map((row) => row.reduce((s, a, j) => s + a * x[j], 0))
}

function dot(a: number[], b: number[]) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** Solve A x = b by Gaussian elimination with partial pivoting (A small and symmetric positive definite here). */
export function solve(A: Matrix, b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const pivot = M[c][c] || 1e-12
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / pivot
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n]
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]
    x[r] = s / (M[r][r] || 1e-12)
  }
  return x
}

// ---------- inputs ----------

/** Annualised covariance of daily returns, shrunk toward its diagonal. */
export function shrunkCovariance(returns: number[][], shrinkage = SHRINKAGE): Matrix {
  const n = returns.length
  const T = returns[0]?.length ?? 0
  const means = returns.map((r) => r.reduce((s, v) => s + v, 0) / T)
  const S: Matrix = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0
      for (let t = 0; t < T; t++) s += (returns[i][t] - means[i]) * (returns[j][t] - means[j])
      const c = (s / Math.max(T - 1, 1)) * TRADING_DAYS
      S[i][j] = S[j][i] = i === j ? c : (1 - shrinkage) * c
    }
  }
  return S
}

/** Excess returns the market is implicitly pricing in: pi = delta * Sigma * w_market. */
export function impliedReturns(cov: Matrix, marketWeights: number[], riskAversion = RISK_AVERSION) {
  return matVec(cov, marketWeights).map((v) => riskAversion * v)
}

export function marketWeights(caps: Array<number | null>) {
  const known = caps.filter((c): c is number => c != null && c > 0)
  const fill = known.length ? known.reduce((s, c) => s + c, 0) / known.length : 1
  const w = caps.map((c) => (c != null && c > 0 ? c : fill))
  const total = w.reduce((s, v) => s + v, 0)
  return w.map((v) => v / total)
}

/**
 * Black-Litterman posterior excess returns with one absolute view per scored
 * stock. Scores are standardised across the stocks that have them, so the
 * views say which names the reports favour relative to the rest, not that
 * everything will go up. Each view's uncertainty follows He-Litterman
 * (proportional to tau * its variance), divided by how many report types
 * back it and by the chosen confidence.
 */
export function blackLitterman(
  pi: number[],
  cov: Matrix,
  symbols: string[],
  views: Record<string, SparkleView>,
  confidence = 1,
) {
  const scored = symbols
    .map((s, i) => ({ i, v: views[s] }))
    .filter((x): x is { i: number; v: SparkleView } => !!x.v && Number.isFinite(x.v.score) && x.v.coverage > 0)
  if (scored.length < 2 || confidence <= 0) return { posterior: [...pi], used: 0 }

  // Standardise against every scored stock in the views payload, not only this universe,
  // so a two-stock universe still knows whether its names score well overall.
  const all = Object.values(views).map((v) => v.score).filter(Number.isFinite)
  const mean = all.reduce((s, v) => s + v, 0) / all.length
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - mean) ** 2, 0) / all.length) || 1

  const idx = scored.map((x) => x.i)
  const q = scored.map(({ i, v }) => pi[i] + ((v.score - mean) / sd) * VIEW_SCALE * Math.sqrt(cov[i][i]))
  const omega = scored.map(({ i, v }) => (TAU * cov[i][i]) / (v.coverage * confidence))

  // mu = pi + tau Sigma P' (tau P Sigma P' + Omega)^-1 (q - P pi), with P selecting the viewed stocks.
  const k = idx.length
  const A: Matrix = Array.from({ length: k }, (_, r) =>
    Array.from({ length: k }, (_, c) => TAU * cov[idx[r]][idx[c]] + (r === c ? omega[r] : 0)),
  )
  const gap = idx.map((i, r) => q[r] - pi[i])
  const y = solve(A, gap)
  const posterior = pi.map((p, i) => p + TAU * idx.reduce((s, j, r) => s + cov[i][j] * y[r], 0))
  return { posterior, used: k }
}

// ---------- optimisation ----------

/** Euclidean projection onto { w : 0 <= w_i <= cap, sum w = 1 }. */
export function projectCappedSimplex(v: number[], cap: number): number[] {
  const n = v.length
  const u = Math.max(cap, 1 / n)
  let lo = Math.min(...v) - u
  let hi = Math.max(...v)
  for (let it = 0; it < 100; it++) {
    const tau = (lo + hi) / 2
    const s = v.reduce((acc, x) => acc + Math.min(u, Math.max(0, x - tau)), 0)
    if (s > 1) lo = tau
    else hi = tau
  }
  const tau = (lo + hi) / 2
  const w = v.map((x) => Math.min(u, Math.max(0, x - tau)))
  const s = w.reduce((a, b) => a + b, 0) || 1
  return w.map((x) => x / s)
}

function lipschitz(cov: Matrix) {
  // Power iteration for the largest eigenvalue of Sigma.
  let x = new Array(cov.length).fill(1 / Math.sqrt(cov.length))
  let lambda = 0
  for (let it = 0; it < 50; it++) {
    const y = matVec(cov, x)
    lambda = Math.sqrt(dot(y, y))
    if (!lambda) return 1
    x = y.map((v) => v / lambda)
  }
  return lambda
}

/** minimise 1/2 w'Sigma w - lambda mu'w over the capped simplex (accelerated projected gradient). */
export function meanVariance(mu: number[], cov: Matrix, lambda: number, cap: number, start?: number[], L = lipschitz(cov)) {
  const n = mu.length
  let w = start ? [...start] : new Array(n).fill(1 / n)
  let z = [...w]
  let t = 1
  const step = 1 / L
  for (let it = 0; it < 600; it++) {
    const g = matVec(cov, z).map((v, i) => v - lambda * mu[i])
    const next = projectCappedSimplex(z.map((v, i) => v - step * g[i]), cap)
    const tNext = (1 + Math.sqrt(1 + 4 * t * t)) / 2
    z = next.map((v, i) => v + ((t - 1) / tNext) * (v - w[i]))
    let moved = 0
    for (let i = 0; i < n; i++) moved = Math.max(moved, Math.abs(next[i] - w[i]))
    w = next
    t = tNext
    if (moved < 1e-9) break
  }
  return w
}

/** Equal risk contribution weights (Spinu-style multiplicative updates). */
export function riskParity(cov: Matrix, cap: number) {
  const n = cov.length
  let w = cov.map((row, i) => 1 / Math.sqrt(row[i] || 1e-6))
  let s = w.reduce((a, b) => a + b, 0)
  w = w.map((x) => x / s)
  for (let it = 0; it < 500; it++) {
    const m = matVec(cov, w)
    const total = dot(w, m)
    const next = w.map((x, i) => x * Math.sqrt(total / n / Math.max(x * m[i], 1e-16)))
    s = next.reduce((a, b) => a + b, 0)
    const norm = next.map((x) => x / s)
    let moved = 0
    for (let i = 0; i < n; i++) moved = Math.max(moved, Math.abs(norm[i] - w[i]))
    w = norm
    if (moved < 1e-10) break
  }
  return Math.max(...w) > Math.max(cap, 1 / n) ? projectCappedSimplex(w, cap) : w
}

export function pointFor(weights: number[], mu: number[], cov: Matrix, riskFree: number): PortfolioPoint {
  const excess = dot(weights, mu)
  const vol = Math.sqrt(Math.max(dot(weights, matVec(cov, weights)), 0))
  return { weights, ret: riskFree + excess, vol, sharpe: vol > 0 ? excess / vol : 0 }
}

/** Each stock's share of portfolio variance; sums to 1. */
export function riskContributions(weights: number[], cov: Matrix) {
  const m = matVec(cov, weights)
  const total = dot(weights, m) || 1
  return weights.map((w, i) => (w * m[i]) / total)
}

/** The long-only, capped efficient frontier, traced by sweeping risk tolerance. */
export function efficientFrontier(mu: number[], cov: Matrix, cap: number, riskFree: number, steps = 36) {
  const L = lipschitz(cov)
  const spread = Math.max(...mu) - Math.min(...mu) || 1e-3
  const scale = L / spread
  const points: PortfolioPoint[] = []
  let w: number[] | undefined
  for (let k = 0; k < steps; k++) {
    const lambda = k === 0 ? 0 : scale * 10 ** (-3 + (4.5 * (k - 1)) / (steps - 2))
    w = meanVariance(mu, cov, lambda, cap, w, L)
    const p = pointFor(w, mu, cov, riskFree)
    const last = points[points.length - 1]
    if (!last || Math.abs(p.vol - last.vol) > 1e-4 || Math.abs(p.ret - last.ret) > 1e-4) points.push(p)
  }
  return points
}

/** Best Sharpe on the frontier, refined between its neighbours by golden-section search on risk tolerance. */
function maxSharpe(mu: number[], cov: Matrix, cap: number, riskFree: number, frontier: PortfolioPoint[]) {
  if (!frontier.length) return pointFor(projectCappedSimplex(new Array(mu.length).fill(1), cap), mu, cov, riskFree)
  if (Math.max(...mu) <= 0) return frontier[0] // nothing beats cash: the least risky portfolio is the best one
  const L = lipschitz(cov)
  const spread = Math.max(...mu) - Math.min(...mu) || 1e-3
  const scale = L / spread
  const best = frontier.reduce((a, b) => (b.sharpe > a.sharpe ? b : a))
  // Golden-section over log10(lambda / scale) around the best sampled point.
  const sharpeAt = (x: number) => pointFor(meanVariance(mu, cov, scale * 10 ** x, cap, best.weights, L), mu, cov, riskFree)
  let a = -3.5
  let b = 1.5
  const g = (Math.sqrt(5) - 1) / 2
  let c = b - g * (b - a)
  let d = a + g * (b - a)
  let pc = sharpeAt(c)
  let pd = sharpeAt(d)
  for (let it = 0; it < 18; it++) {
    if (pc.sharpe > pd.sharpe) { b = d; d = c; pd = pc; c = b - g * (b - a); pc = sharpeAt(c) }
    else { a = c; c = d; pc = pd; d = a + g * (b - a); pd = sharpeAt(d) }
  }
  const refined = pc.sharpe > pd.sharpe ? pc : pd
  return refined.sharpe >= best.sharpe ? refined : best
}

export function optimize(input: OptimizerInput): OptimizerResult {
  const { symbols, returns, riskFree, model, objective } = input
  const n = symbols.length
  const cap = Math.min(1, Math.max(input.cap, 1 / n))
  const cov = shrunkCovariance(returns)
  const volatility = cov.map((row, i) => Math.sqrt(row[i]))
  const pi = impliedReturns(cov, marketWeights(input.marketCaps))

  let expected = pi
  let viewsUsed = 0
  if (model === "blackLitterman" && input.views) {
    const bl = blackLitterman(pi, cov, symbols, input.views, input.viewConfidence ?? 1)
    expected = bl.posterior
    viewsUsed = bl.used
  } else if (model === "historical") {
    expected = returns.map((r) => (r.reduce((s, v) => s + v, 0) / r.length) * TRADING_DAYS - riskFree)
  }

  const frontier = efficientFrontier(expected, cov, cap, riskFree)
  const optimal =
    objective === "minVariance" ? frontier[0] :
    objective === "riskParity" ? pointFor(riskParity(cov, cap), expected, cov, riskFree) :
    maxSharpe(expected, cov, cap, riskFree, frontier)

  return {
    symbols,
    model,
    objective,
    cap,
    expected: expected.map((e) => e + riskFree),
    equilibrium: pi.map((e) => e + riskFree),
    volatility,
    optimal,
    riskContribution: riskContributions(optimal.weights, cov),
    current: input.current ? pointFor(input.current, expected, cov, riskFree) : null,
    frontier,
    viewsUsed,
  }
}

// ---------- from weights to trades ----------

export type Trade = {
  symbol: string
  price: number
  currentShares: number
  targetShares: number
  shares: number
  amount: number
  currentWeight: number
  targetWeight: number
}

/** Whole-share trades that move a portfolio of `totalValue` to the target weights. */
export function rebalanceTrades(
  symbols: string[],
  targetWeights: number[],
  prices: Record<string, number>,
  currentShares: Record<string, number>,
  totalValue: number,
): Trade[] {
  const all = Array.from(new Set([...symbols, ...Object.keys(currentShares)]))
  return all
    .map((symbol) => {
      const price = prices[symbol] ?? 0
      const i = symbols.indexOf(symbol)
      const targetWeight = i >= 0 ? targetWeights[i] : 0
      const have = currentShares[symbol] ?? 0
      const want = price > 0 ? Math.floor((targetWeight * totalValue) / price + 1e-9) : 0
      // Keep tiny weights out of the trade list: under 0.5% isn't worth a line.
      const targetShares = targetWeight < 0.005 ? 0 : want
      return {
        symbol,
        price,
        currentShares: have,
        targetShares,
        shares: targetShares - have,
        amount: (targetShares - have) * price,
        currentWeight: totalValue > 0 ? (have * price) / totalValue : 0,
        targetWeight,
      }
    })
    .filter((t) => t.price > 0)
    .sort((a, b) => b.targetWeight - a.targetWeight || a.symbol.localeCompare(b.symbol))
}
