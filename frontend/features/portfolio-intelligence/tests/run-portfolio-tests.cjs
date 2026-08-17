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
const stocksFile = path.resolve(root, "..", "..", "lib", "stocks.ts")

function compile() {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, "domain"), { recursive: true })
  fs.mkdirSync(path.join(outDir, "lib"), { recursive: true })

  const stocksSource = fs.readFileSync(stocksFile, "utf8")
  const stocksOutput = ts.transpileModule(stocksSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  fs.writeFileSync(path.join(outDir, "lib", "stocks.js"), stocksOutput.outputText)

  const source = fs.readFileSync(sourceFile, "utf8").replace("@/lib/stocks", "../lib/stocks")
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  fs.writeFileSync(path.join(outDir, "domain", "portfolio-model.js"), output.outputText)
}

compile()

const {
  analyzePortfolio,
  findPairCandidates,
  samplePortfolio,
  scoreStockFactors,
} = require(path.join(outDir, "domain", "portfolio-model.js"))
const { nifty50Stocks } = require(path.join(outDir, "lib", "stocks.js"))

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
