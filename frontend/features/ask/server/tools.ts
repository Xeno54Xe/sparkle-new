// Tools the Ask Sparkle model can call. Each one reads the SparkleAI backend
// and returns a small JSON string for the model, the sources a person can
// open, and a short status line for the UI ("Reading TCS earnings call…").
import type { ToolSpec } from "./llm"
import { getStockBySymbol, nifty50Stocks } from "@/lib/stocks"

export type Source = { title: string; url: string; pdf?: string }
export type ToolResult = { content: string; sources: Source[] }

const BACKEND = () => (process.env.BACKEND_API_URL || "http://localhost:8000").replace(/\/$/, "")
const TOOL_TIMEOUT_MS = 30000
const MAX_TOOL_CHARS = 7000

const REPORT_TYPES = ["EC", "AR", "SR"]
const SECTORS = [...new Set(nifty50Stocks.map((s) => s.sector))].sort()

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "search_reports",
      description:
        "Full-text search across every SparkleAI report: earnings-call (EC) and annual-report (AR) analyses and fortnightly Sparkle Reports (SR). " +
        "Use for questions about what management said, guidance, risks, ESG, Q&A, analyst views, or to find which companies discuss a topic. Returns the best-matching report sections with excerpts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords, e.g. 'deposit growth guidance' or 'AI deal wins margins'" },
          company: { type: "string", description: "Optional company name or NSE symbol to restrict the search" },
          report_type: { type: "string", enum: REPORT_TYPES, description: "Optional: EC, AR or SR" },
          limit: { type: "integer", minimum: 1, maximum: 8 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_report",
      description:
        "Read one SparkleAI report in full (or chosen sections). Defaults to the latest period. EC sections: financial_metrics, risk_intelligence, esg, speaker_sentiment, qa_transparency, overall_sentiment, investment_synthesis. " +
        "AR adds capital_structure, management_discussion, strategy_overview. SR sections: price_performance, news_sentiment, announcements, valuation, technicals, analyst_views, promise_vs_reality.",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company name or NSE symbol" },
          report_type: { type: "string", enum: REPORT_TYPES },
          period: { type: "string", description: "Optional, e.g. JAN26, FY25, or an SR date like 2026-10-17" },
          sections: { type: "array", items: { type: "string" }, description: "Optional section keys to read" },
        },
        required: ["company", "report_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_reports",
      description: "List which earnings calls, annual reports and Sparkle Reports exist for a company (periods, newest first).",
      parameters: {
        type: "object",
        properties: { company: { type: "string", description: "Company name or NSE symbol" } },
        required: ["company"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stock_snapshot",
      description:
        "Live overview of one Nifty 50 stock: price and day change, valuation and balance-sheet metrics, 52-week range, technical signal with key indicators, " +
        "1-year return / volatility / beta / alpha vs the Nifty 50, factor percentiles when available, and the latest report scores.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string", description: "NSE symbol, e.g. INFY, HDFCBANK, M&M" } },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_stocks",
      description: "Side-by-side snapshots of 2 to 4 Nifty 50 stocks (same data as stock_snapshot, trimmed).",
      parameters: {
        type: "object",
        properties: { symbols: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } },
        required: ["symbols"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stock_news",
      description: "Headlines naming one company from the last 7 days, each with a tone (positive/negative/neutral), and the overall mood.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string" } },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "screen_stocks",
      description:
        "Filter and rank all Nifty 50 stocks by their technical analysis (15 indicators): signal, score, RSI, MACD, ADX, distance from 50/200-day averages, today's move.",
      parameters: {
        type: "object",
        properties: {
          signal: { type: "string", enum: ["BUY", "HOLD", "SELL"] },
          sector: { type: "string", enum: SECTORS },
          rsi_below: { type: "number" },
          rsi_above: { type: "number" },
          above_sma200: { type: "boolean", description: "true: price above its 200-day average; false: below" },
          sort_by: { type: "string", enum: ["score", "change_pct", "rsi", "vs_sma200"], description: "Sorted high to low" },
          ascending: { type: "boolean" },
          limit: { type: "integer", minimum: 1, maximum: 15 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "market_overview",
      description: "Today's market: Nifty 50 / Sensex / Bank Nifty levels and moves, biggest movers, sector averages and top market headlines.",
      parameters: { type: "object", properties: {} },
    },
  },
]

// ── helpers ──────────────────────────────────────────────────────────────

async function backend(path: string, signal?: AbortSignal): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener("abort", onAbort)
  try {
    const res = await fetch(BACKEND() + path, { cache: "no-store", signal: controller.signal })
    if (!res.ok) return { error: `Data service answered ${res.status}` }
    return await res.json()
  } catch (e) {
    return { error: controller.signal.aborted ? "Data service timed out" : `Data service unreachable: ${(e as Error).message}` }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", onAbort)
  }
}

function omit<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k))) as Partial<T>
}

function pack(data: unknown): string {
  const text = JSON.stringify(data)
  return text.length > MAX_TOOL_CHARS ? text.slice(0, MAX_TOOL_CHARS) + "…[truncated]" : text
}

function normalizeSymbol(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase().replace(/\.NS$/, "")
}

function knownSymbol(raw: unknown): string | null {
  const sym = normalizeSymbol(raw)
  if (getStockBySymbol(sym)) return sym
  // let people say "Infosys" or "HDFC Bank" too
  const byName = nifty50Stocks.find((s) => s.name.toUpperCase() === sym || s.name.toUpperCase().startsWith(sym))
  return byName?.symbol ?? null
}

function stockPage(symbol: string): Source {
  const name = getStockBySymbol(symbol)?.name ?? symbol
  return { title: `${name} (${symbol})`, url: `/stock/${encodeURIComponent(symbol)}` }
}

const qs = (params: Record<string, unknown>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])).toString()

// ── tool implementations ─────────────────────────────────────────────────

type Args = Record<string, any>
type Impl = (args: Args, signal?: AbortSignal) => Promise<ToolResult>

const impls: Record<string, Impl> = {
  async search_reports(args, signal) {
    const data = await backend(
      `/ask/search?${qs({ q: String(args.query ?? "").slice(0, 300), company: args.company, doc_type: args.report_type, limit: Math.min(Number(args.limit) || 6, 8) })}`,
      signal
    )
    if (data.error) return { content: pack(data), sources: [] }
    const results = (data.results ?? []) as Array<any>
    return {
      content: pack(results.length ? results.map((r) => omit(r, ["relevance"])) : { results: [], note: "No matching report sections." }),
      sources: results.map((r) => r.source as Source),
    }
  },

  async read_report(args, signal) {
    const sections = Array.isArray(args.sections) ? args.sections.join(",") : args.sections
    const data = await backend(`/ask/report?${qs({ company: args.company, doc_type: args.report_type, period: args.period, sections })}`, signal)
    return { content: pack(data), sources: data.source ? [data.source] : [] }
  },

  async list_reports(args, signal) {
    const data = await backend("/ask/catalog", signal)
    if (data.error) return { content: pack(data), sources: [] }
    const needle = String(args.company ?? "").trim().toLowerCase()
    const sym = knownSymbol(args.company)
    const match = (data.companies as Array<any>).find(
      (c) => (sym && c.symbol === sym) || c.company.toLowerCase() === needle || c.company.toLowerCase().includes(needle)
    )
    return {
      content: pack(match ?? { error: `No reports for '${args.company}'.` }),
      sources: match?.symbol ? [{ title: `${match.company} reports`, url: `/stock/${encodeURIComponent(match.symbol)}/intelligence` }] : [],
    }
  },

  async stock_snapshot(args, signal) {
    const sym = knownSymbol(args.symbol)
    if (!sym) return { content: pack({ error: `${args.symbol} is not in the Nifty 50 list SparkleAI covers.` }), sources: [] }
    const data = await backend(`/ask/snapshot/${encodeURIComponent(sym)}`, signal)
    return { content: pack(data), sources: data.error ? [] : [stockPage(sym)] }
  },

  async compare_stocks(args, signal) {
    const symbols = [...new Set(((args.symbols as unknown[]) ?? []).map(knownSymbol).filter(Boolean) as string[])].slice(0, 4)
    if (symbols.length < 2) return { content: pack({ error: "Need at least two Nifty 50 symbols to compare." }), sources: [] }
    const snaps = await Promise.all(symbols.map((s) => backend(`/ask/snapshot/${encodeURIComponent(s)}`, signal)))
    const trimmed = snaps.map((d) => {
      if (d.error) return d
      return {
        ...omit(d, ["links", "fifty_two_week"]),
        technical: d.technical && { signal: d.technical.signal, score: d.technical.score, RSI: d.technical.indicators?.RSI },
      }
    })
    return { content: pack(trimmed), sources: symbols.map(stockPage) }
  },

  async stock_news(args, signal) {
    const sym = knownSymbol(args.symbol)
    if (!sym) return { content: pack({ error: `${args.symbol} is not in the Nifty 50 list.` }), sources: [] }
    const data = await backend(`/news/stock/${encodeURIComponent(sym)}`, signal)
    if (data.error && !data.articles) return { content: pack(data), sources: [] }
    const articles = ((data.articles ?? []) as Array<any>).slice(0, 10)
    return {
      content: pack({
        symbol: sym,
        mood: data.mood,
        lookback_days: data.lookback_days,
        headlines: articles.map((a) => ({ title: a.title, source: a.source, when: a.time, tone: a.tone, url: a.link })),
      }),
      sources: [{ title: `${getStockBySymbol(sym)?.name ?? sym} news`, url: `/stock/${encodeURIComponent(sym)}` }],
    }
  },

  async screen_stocks(args, signal) {
    const data = await backend("/market/screener", signal)
    if (data.error || !Array.isArray(data.stocks)) return { content: pack({ error: data.error || "Screener unavailable" }), sources: [] }
    let rows = data.stocks as Array<any>
    if (args.signal) rows = rows.filter((r) => r.signal === args.signal)
    if (args.sector) rows = rows.filter((r) => r.sector === args.sector)
    if (args.rsi_below != null) rows = rows.filter((r) => r.rsi < Number(args.rsi_below))
    if (args.rsi_above != null) rows = rows.filter((r) => r.rsi > Number(args.rsi_above))
    if (args.above_sma200 != null) rows = rows.filter((r) => (r.vs_sma200 > 0) === Boolean(args.above_sma200))
    const key = ({ score: "overall_score", change_pct: "change_pct", rsi: "rsi", vs_sma200: "vs_sma200" } as Record<string, string>)[args.sort_by] || "overall_score"
    rows = [...rows].sort((a, b) => (args.ascending ? a[key] - b[key] : b[key] - a[key]))
    const limit = Math.min(Number(args.limit) || 10, 15)
    return {
      content: pack({
        matched: rows.length,
        stocks: rows.slice(0, limit).map((r) => ({
          symbol: r.symbol, name: r.name, sector: r.sector, price: r.price, change_pct: r.change_pct,
          signal: r.signal, score: r.overall_score, rsi: r.rsi, macd_bullish: r.macd_bullish, adx: r.adx,
          vs_sma50_pct: r.vs_sma50, vs_sma200_pct: r.vs_sma200, candle: r.candle,
        })),
        computed: data.timestamp,
      }),
      sources: [{ title: "Screener", url: "/screener" }],
    }
  },

  async market_overview(_args, signal) {
    const [indices, movers, heat, news] = await Promise.all([
      backend("/market/indices", signal),
      backend("/market/most-active", signal),
      backend("/market/heatmap", signal),
      backend("/news", signal),
    ])
    const sectors = new Map<string, number[]>()
    for (const s of (heat.stocks ?? []) as Array<any>) {
      sectors.set(s.sector, [...(sectors.get(s.sector) ?? []), s.change_pct])
    }
    const bySector = [...sectors.entries()]
      .map(([sector, xs]) => ({ sector, avg_change_pct: Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)), stocks: xs.length }))
      .sort((a, b) => b.avg_change_pct - a.avg_change_pct)
    const all = ((heat.stocks ?? []) as Array<any>).slice().sort((a, b) => b.change_pct - a.change_pct)
    return {
      content: pack({
        indices: (indices.indices ?? []).map((i: any) => ({ name: i.name, value: i.value, change_pct: i.change_pct })),
        top_gainers: all.slice(0, 5).map((s) => ({ symbol: s.symbol, change_pct: s.change_pct })),
        top_losers: all.slice(-5).reverse().map((s) => ({ symbol: s.symbol, change_pct: s.change_pct })),
        most_active: ((movers.stocks ?? []) as Array<any>).slice(0, 5).map((s) => ({ symbol: s.symbol, change_pct: s.change_pct, volume: s.volume_fmt })),
        sectors: bySector,
        headlines: ((news.articles ?? []) as Array<any>).slice(0, 8).map((a) => ({ title: a.title, source: a.source, when: a.time, url: a.link })),
        as_of: indices.timestamp,
      }),
      sources: [{ title: "Market dashboard", url: "/dashboard" }, { title: "Heatmap", url: "/heatmap" }],
    }
  },
}

export const TOOL_STATUS: Record<string, (args: Args) => string> = {
  search_reports: (a) => `Searching reports for “${String(a.query ?? "").slice(0, 60)}”${a.company ? ` in ${a.company}` : ""}`,
  read_report: (a) => `Reading ${a.company} ${({ EC: "earnings call", AR: "annual report", SR: "Sparkle Report" } as Record<string, string>)[a.report_type] ?? "report"}${a.period ? ` ${a.period}` : ""}`,
  list_reports: (a) => `Listing reports for ${a.company}`,
  stock_snapshot: (a) => `Checking ${normalizeSymbol(a.symbol)}: price, technicals, fundamentals`,
  compare_stocks: (a) => `Comparing ${((a.symbols as string[]) ?? []).map(normalizeSymbol).join(", ")}`,
  stock_news: (a) => `Reading ${normalizeSymbol(a.symbol)} news`,
  screen_stocks: () => "Screening the Nifty 50",
  market_overview: () => "Checking today's market",
}

export async function runTool(name: string, rawArgs: string, signal?: AbortSignal): Promise<ToolResult & { status: string }> {
  let args: Args = {}
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {}
  } catch {
    return { content: pack({ error: "Tool arguments were not valid JSON." }), sources: [], status: name }
  }
  const impl = impls[name]
  const status = TOOL_STATUS[name]?.(args) ?? name
  if (!impl) return { content: pack({ error: `Unknown tool ${name}` }), sources: [], status }
  try {
    return { ...(await impl(args, signal)), status }
  } catch (e) {
    return { content: pack({ error: (e as Error).message }), sources: [], status }
  }
}
