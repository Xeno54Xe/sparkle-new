/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const source = path.resolve(__dirname, "..", "domain", "optimizer.ts")
const out = path.join(os.tmpdir(), "sparkle-optimizer-tests.js")
fs.writeFileSync(out, ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)
const opt = require(out)

const close = (a, b, tol = 1e-3) => assert(Math.abs(a - b) <= tol, `${a} != ${b}`)
const sum = (w) => w.reduce((s, v) => s + v, 0)
// Two uncorrelated assets: variances 0.04 and 0.01.
const cov = [[0.04, 0], [0, 0.01]]

test("projection onto the capped simplex sums to one and respects the cap", () => {
  const w = opt.projectCappedSimplex([5, 1, 0.2, -3], 0.4)
  close(sum(w), 1, 1e-9)
  assert(w.every((x) => x >= 0 && x <= 0.4 + 1e-9))
  close(w[0], 0.4, 1e-6)
})

test("minimum variance weights are inversely proportional to variance when uncorrelated", () => {
  const w = opt.meanVariance([0, 0], cov, 0, 1)
  close(w[0], 0.2)
  close(w[1], 0.8)
})

test("risk parity weights are inversely proportional to volatility when uncorrelated", () => {
  const w = opt.riskParity(cov, 1)
  close(w[0], 1 / 3)
  close(w[1], 2 / 3)
  const rc = opt.riskContributions(w, cov)
  close(rc[0], 0.5)
})

test("the cap binds when the unconstrained answer is too concentrated", () => {
  const w = opt.meanVariance([0, 0], cov, 0, 0.6)
  close(w[1], 0.6)
  close(w[0], 0.4)
})

test("max Sharpe matches the tangency portfolio Sigma^-1 mu", () => {
  // Deterministic, uncorrelated daily returns with known means.
  const T = 252
  const a = Array.from({ length: T }, (_, t) => 0.1 / T + (t % 2 ? 0.0126 : -0.0126))
  const b = Array.from({ length: T }, (_, t) => 0.05 / T + (Math.floor(t / 2) % 2 ? 0.0063 : -0.0063))
  const res = opt.optimize({ symbols: ["A", "B"], returns: [a, b], marketCaps: [1, 1], riskFree: 0, model: "historical", objective: "maxSharpe", cap: 1 })
  const S = opt.shrunkCovariance([a, b])
  const mu = res.expected
  const raw = opt.solve(S, mu)
  const tangency = raw.map((x) => x / sum(raw))
  close(res.optimal.weights[0], tangency[0], 5e-3)
  close(sum(res.optimal.weights), 1, 1e-9)
  // Frontier runs from the minimum-variance point upward and nothing on it beats the optimum.
  assert(res.frontier.every((p) => p.sharpe <= res.optimal.sharpe + 1e-6))
  close(res.frontier[0].vol, Math.min(...res.frontier.map((p) => p.vol)), 1e-6)
})

test("implied returns reproduce the market portfolio as the max-Sharpe answer", () => {
  const T = 252
  const r = (k, phase) => Array.from({ length: T }, (_, t) => Math.sin(t * k + phase) * 0.01)
  const returns = [r(0.3, 0), r(0.7, 1), r(1.1, 2)]
  const caps = [3, 2, 1]
  const res = opt.optimize({ symbols: ["X", "Y", "Z"], returns, marketCaps: caps, riskFree: 0.065, model: "equilibrium", objective: "maxSharpe", cap: 1 })
  ;[0.5, 1 / 3, 1 / 6].forEach((w, i) => close(res.optimal.weights[i], w, 1e-2))
})

test("Black-Litterman leaves returns alone without views and tilts toward better-scored stocks", () => {
  const pi = opt.impliedReturns(cov, [0.5, 0.5])
  const none = opt.blackLitterman(pi, cov, ["A", "B"], {})
  assert.deepEqual(none.posterior, pi)
  const same = opt.blackLitterman(pi, cov, ["A", "B"], { A: { score: 70, coverage: 1, sources: [] }, B: { score: 70, coverage: 1, sources: [] } })
  pi.forEach((p, i) => close(same.posterior[i], p, 1e-12))
  const views = { A: { score: 80, coverage: 1, sources: [] }, B: { score: 60, coverage: 1, sources: [] } }
  const bl = opt.blackLitterman(pi, cov, ["A", "B"], views)
  assert(bl.posterior[0] > pi[0] && bl.posterior[1] < pi[1])
  const stronger = opt.blackLitterman(pi, cov, ["A", "B"], views, 4)
  assert(stronger.posterior[0] > bl.posterior[0])
  const off = opt.blackLitterman(pi, cov, ["A", "B"], views, 0)
  assert.deepEqual(off.posterior, pi)
})

test("rebalancing trades whole shares and sells what the target drops", () => {
  const trades = opt.rebalanceTrades(["A", "B"], [0.75, 0.25], { A: 100, B: 30, C: 50 }, { A: 0, C: 20 }, 1000)
  const by = Object.fromEntries(trades.map((t) => [t.symbol, t]))
  assert.equal(by.A.shares, 7)
  assert.equal(by.B.shares, 8)
  assert.equal(by.C.shares, -20)
  close(by.C.currentWeight, 1)
})
