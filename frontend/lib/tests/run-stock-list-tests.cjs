/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const libDir = path.resolve(__dirname, "..")
const outputsDir = path.resolve(libDir, "..", "..", "integrated-backend", "outputs")
const outDir = path.join(os.tmpdir(), "sparkle-stock-list-tests")
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(libDir, "nifty50.json"), path.join(outDir, "nifty50.json"))
for (const name of ["stocks", "company-folders", "stock-logos", "demo-prices"]) {
  const source = fs.readFileSync(path.join(libDir, `${name}.ts`), "utf8")
  fs.writeFileSync(path.join(outDir, `${name}.js`), ts.transpileModule(source, { compilerOptions }).outputText)
}

const { nifty50Stocks, getStockBySymbol } = require(path.join(outDir, "stocks.js"))
const { companyFolder } = require(path.join(outDir, "company-folders.js"))
const { getStockLogoUrl } = require(path.join(outDir, "stock-logos.js"))
const { demoStocks } = require(path.join(outDir, "demo-prices.js"))

test("the list has 50 unique, complete stocks", () => {
  assert.equal(nifty50Stocks.length, 50)
  assert.equal(new Set(nifty50Stocks.map((s) => s.symbol)).size, 50)
  for (const s of nifty50Stocks) {
    assert.ok(s.name && s.sector, s.symbol)
    assert.equal(s.yahoo, `${s.symbol}.NS`)
  }
})

test("lookup ignores case and rejects unknown symbols", () => {
  assert.equal(getStockBySymbol("tcs")?.symbol, "TCS")
  assert.equal(getStockBySymbol("M&M")?.name, "Mahindra & Mahindra")
  assert.equal(getStockBySymbol("NOPE"), undefined)
})

test("report folders exist and fall back to the symbol", () => {
  for (const s of nifty50Stocks.filter((s) => s.folder)) {
    assert.equal(companyFolder(s.symbol), s.folder)
    if (fs.existsSync(outputsDir)) assert.ok(fs.existsSync(path.join(outputsDir, s.folder)), s.folder)
  }
  assert.equal(companyFolder("ASIANPAINT"), "ASIANPAINT")
})

test("every stock has a logo, or none so the initials show without a failed request", () => {
  // These companies have no favicon Google can serve; logo is null on purpose.
  const noLogo = new Set(["NTPC", "SBILIFE", "LTM"])
  for (const s of nifty50Stocks) {
    if (noLogo.has(s.symbol)) assert.equal(getStockLogoUrl(s.symbol), "", s.symbol)
    else assert.match(getStockLogoUrl(s.symbol), /^\/api\/logo\?domain=/, s.symbol)
  }
  assert.equal(getStockLogoUrl("NOPE"), "")
})

test("every stock has a demo price for the offline fallback", () => {
  assert.equal(demoStocks.length, 50)
  for (const s of demoStocks) assert.ok(s.price > 0 && s.price !== 100, s.symbol)
})

test("new-report labels read naturally", () => {
  const source = fs.readFileSync(path.join(libDir, "fresh-reports.ts"), "utf8")
  fs.writeFileSync(path.join(outDir, "fresh-reports.js"), ts.transpileModule(source, { compilerOptions }).outputText)
  const { describeFresh } = require(path.join(outDir, "fresh-reports.js"))
  assert.equal(describeFresh({ kind: "sparkle", label: "Sparkle Report", period: "2026-10-17" }), "Sparkle Report, 17 Oct")
  assert.equal(describeFresh({ kind: "ec", label: "Earnings call", period: "FEB26" }), "Earnings call, Feb 2026")
  assert.equal(describeFresh({ kind: "ar", label: "Annual report", period: "FY26" }), "Annual report, FY26")
  assert.equal(describeFresh({ kind: "ec", label: "Earnings call", period: "Q3" }), "Earnings call, Q3")
})
