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
  findPairCandidates,
  samplePortfolio,
  scoreStockFactors,
} = require(path.join(outDir, "domain", "portfolio-model.js"))
const { demoStocks: nifty50Stocks } = require(path.join(outDir, "lib", "demo-prices.js"))

test("portfolio summary derives value, risk and factor tilts", () => {
  const summary = analyzePortfolio(samplePortfolio)
  assert(summary.totalValue > 0)
  assert(summary.holdings.length === samplePortfolio.length)
  assert(summary.factorTilt.alpha > 0)
  assert(summary.sectorWeights.length > 0)
  assert(summary.themes.length > 0)
  assert(summary.effectiveStocks > 1)
  assert(summary.rebalanceNotes.length > 0)
})

test("factor scores stay in displayable range", () => {
  const scores = scoreStockFactors(nifty50Stocks[0])
  Object.values(scores).forEach((score) => {
    assert(score >= 0)
    assert(score <= 100)
  })
})

test("pairs lab returns ranked same-sector candidates", () => {
  const pairs = findPairCandidates(4)
  assert.equal(pairs.length, 4)
  pairs.forEach((pair) => {
    assert(pair.left.sector === pair.right.sector)
    assert(pair.points.length === 45)
    assert(pair.confidence >= 0)
    assert(pair.signal.length > 0)
  })
})
