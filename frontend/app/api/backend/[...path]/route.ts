import { NextRequest, NextResponse } from "next/server"
import { nifty50Stocks, getStockBySymbol } from "@/lib/stocks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000"
const PROXY_TIMEOUT_MS = 4500

type Stock = typeof nifty50Stocks[number]
type SignalName = "BUY" | "SELL" | "HOLD"

function nowIso() {
  return new Date().toISOString()
}

function normalizeSymbol(value: string) {
  return decodeURIComponent(value)
    .replace(/\.NS$/i, "")
    .replace(/^\^/, "")
    .toUpperCase()
}

function stockFor(value: string): Stock {
  const symbol = normalizeSymbol(value)
  return getStockBySymbol(symbol) || nifty50Stocks[0]
}

function signalFor(stock: Stock) {
  const positive = stock.change >= 0
  const overallScore = Math.max(24, Math.min(82, Math.round(50 + stock.change * 8)))
  const signal: SignalName = overallScore >= 60 ? "BUY" : overallScore <= 40 ? "SELL" : "HOLD"
  const buy = signal === "BUY" ? 7 : signal === "SELL" ? 3 : 5
  const sell = signal === "SELL" ? 7 : signal === "BUY" ? 3 : 4
  const neutral = Math.max(0, 11 - buy - sell)

  return {
    signal,
    overall_score: overallScore,
    scores: {
      trend: Math.max(20, Math.min(88, overallScore + (positive ? 6 : -8))),
      momentum: Math.max(20, Math.min(88, overallScore + Math.round(stock.change * 2))),
      oscillators: Math.max(20, Math.min(88, 50 + Math.round(stock.change * 5))),
      volume: Math.max(20, Math.min(88, 48 + Math.round(Math.abs(stock.change) * 7))),
      patterns: Math.max(20, Math.min(88, overallScore + (positive ? 2 : -2))),
    },
    counts: { buy, sell, neutral },
  }
}

function indicatorsFor(stock: Stock) {
  const p = stock.price
  const positive = stock.change >= 0
  const drift = positive ? 1 : -1

  return {
    price: p,
    RSI: Math.max(24, Math.min(76, 50 + stock.change * 6)),
    MACD: Number((stock.change * 1.7).toFixed(2)),
    MACDSignal: Number((stock.change * 1.2 - drift * 0.35).toFixed(2)),
    MACDHist: Number((stock.change * 0.5 + drift * 0.35).toFixed(2)),
    ADX: Math.max(16, Math.min(42, 22 + Math.abs(stock.change) * 3)),
    SMA50: Number((p * (positive ? 0.982 : 1.018)).toFixed(2)),
    SMA200: Number((p * (positive ? 0.94 : 1.055)).toFixed(2)),
    EMA20: Number((p * (positive ? 0.992 : 1.01)).toFixed(2)),
    EMA9: Number((p * (positive ? 0.996 : 1.006)).toFixed(2)),
    VWAP: Number((p * (positive ? 0.988 : 1.012)).toFixed(2)),
    ROC: Number(stock.change.toFixed(2)),
    stochK: Math.max(18, Math.min(84, 50 + stock.change * 5)),
    CCI: Math.max(-145, Math.min(145, stock.change * 42)),
    WilliamsR: Math.max(-88, Math.min(-12, -50 + stock.change * 8)),
    MFI: Math.max(22, Math.min(82, 50 + stock.change * 4)),
    OBV: positive ? 1 : -1,
    ichimokuTenkan: Number((p * (positive ? 0.99 : 1.011)).toFixed(2)),
    ichimokuKijun: Number((p * (positive ? 0.975 : 1.024)).toFixed(2)),
    candle: {
      latest: positive ? "Bullish continuation" : "Bearish pressure",
      type: positive ? "bullish" : "bearish",
      reliability: Math.abs(stock.change) > 1.5 ? "medium" : "low",
      description: "Local fallback pattern generated from the bundled Nifty 50 snapshot.",
    },
    crossovers: {
      golden: {
        name: "50/200 SMA",
        status: positive ? "Bullish" : "Bearish",
        daysAgo: Math.max(1, Math.round(12 - Math.min(10, Math.abs(stock.change) * 2))),
      },
      ema: {
        name: "9/20 EMA",
        status: positive ? "Bullish" : "Bearish",
        daysAgo: Math.max(1, Math.round(5 - Math.min(4, Math.abs(stock.change)))),
      },
    },
  }
}

function priceFor(stock: Stock) {
  const prevClose = stock.price / (1 + stock.change / 100)
  return {
    price: stock.price,
    prev_close: Number(prevClose.toFixed(2)),
    change: Number((stock.price - prevClose).toFixed(2)),
    change_pct: stock.change,
  }
}

function screenerStock(stock: Stock) {
  const indicators = indicatorsFor(stock)
  const signal = signalFor(stock)
  const vsSma50 = ((stock.price - indicators.SMA50) / indicators.SMA50) * 100
  const vsSma200 = ((stock.price - indicators.SMA200) / indicators.SMA200) * 100

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price,
    change_pct: stock.change,
    is_positive: stock.change >= 0,
    signal: signal.signal,
    overall_score: signal.overall_score,
    scores: signal.scores,
    counts: signal.counts,
    rsi: indicators.RSI,
    macd_bullish: indicators.MACD > indicators.MACDSignal,
    adx: indicators.ADX,
    vs_sma50: Number(vsSma50.toFixed(2)),
    vs_sma200: Number(vsSma200.toFixed(2)),
    candle: indicators.candle.latest,
    candle_type: indicators.candle.type,
  }
}

function stockInfoFor(stock: Stock) {
  const sectorFactor = Math.max(1, stock.sector.length / 4)

  return {
    symbol: `${stock.symbol}.NS`,
    name: stock.name,
    sector: stock.sector,
    industry: stock.sector,
    price: priceFor(stock),
    metrics: {
      market_cap: Math.round(stock.price * 12500000 * sectorFactor),
      pe_ratio: Number((18 + Math.abs(stock.change) * 2.1).toFixed(2)),
      forward_pe: Number((16 + Math.abs(stock.change) * 1.8).toFixed(2)),
      pb_ratio: Number((2.2 + Math.abs(stock.change) / 3).toFixed(2)),
      eps: Number((stock.price / 24).toFixed(2)),
      dividend_yield: Number((0.4 + Math.abs(stock.change) / 5).toFixed(2)),
      roe: Number((12 + Math.abs(stock.change) * 2).toFixed(2)),
      debt_to_equity: Number((0.25 + Math.abs(stock.change) / 10).toFixed(2)),
      current_ratio: Number((1.1 + Math.abs(stock.change) / 12).toFixed(2)),
      beta: Number((0.85 + Math.abs(stock.change) / 10).toFixed(2)),
      book_value: Number((stock.price / 3.4).toFixed(2)),
    },
  }
}

function marketIndices() {
  const avgChange = nifty50Stocks.reduce((sum, stock) => sum + stock.change, 0) / nifty50Stocks.length
  const indices = [
    { symbol: "N50", name: "Nifty 50", value: 24128.85, change_pct: avgChange },
    { symbol: "SEN", name: "Sensex", value: 79246.15, change_pct: avgChange * 0.92 },
    { symbol: "BNK", name: "Bank Nifty", value: 52480.25, change_pct: avgChange * 1.12 },
  ]

  return {
    indices: indices.map((index) => {
      const previous = index.value / (1 + index.change_pct / 100)
      const changeAbs = index.value - previous
      return {
        ...index,
        change_pct: Number(index.change_pct.toFixed(2)),
        change_abs: Number(changeAbs.toFixed(2)),
        is_positive: index.change_pct >= 0,
      }
    }),
    timestamp: nowIso(),
  }
}

function reportsFor(company?: string) {
  const item = {
    period: "FY2025",
    label: "FY2025",
  }
  return {
    company,
    earnings_calls: [item],
    annual_reports: [item],
  }
}

function fundamentalFor(company: string, category: string, period: string) {
  const label = category === "AR" ? "Annual Report" : "Earnings Call"
  return {
    company,
    doc_type: category.toLowerCase(),
    period,
    sections: {
      financial_metrics: {
        title: "Financial Metrics",
        label: "Stable",
        score: 68,
        bullets: [`${company} has placeholder local analysis for ${label} ${period}.`, "Connect the backend for document-derived scores."],
      },
      risk_intelligence: {
        title: "Risk Intelligence",
        label: "Moderate",
        score: 54,
        bullets: ["Local fallback data is limited to bundled demo context.", "Use live backend outputs for production-grade risk signals."],
      },
      investment_synthesis: {
        title: "Investment Synthesis",
        label: "Watchlist",
        score: 61,
        bullets: ["Technical and market snapshots are available locally.", "Fundamental details require processed backend reports."],
      },
    },
  }
}

function fallbackFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)

  if (pathname === "/" || pathname === "") {
    return { message: "SparkleAI local API fallback", timestamp: nowIso() }
  }

  if (pathname === "/market/indices") return marketIndices()

  if (pathname === "/market/most-active") {
    return {
      stocks: [...nifty50Stocks]
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 8)
        .map((stock, index) => ({
          rank: index + 1,
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change_pct: stock.change,
          is_positive: stock.change >= 0,
          volume_fmt: `${(42 - index * 2.7).toFixed(1)}M`,
        })),
      timestamp: nowIso(),
    }
  }

  if (pathname === "/market/heatmap") {
    return {
      stocks: nifty50Stocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        price: stock.price,
        change_pct: stock.change,
      })),
      count: nifty50Stocks.length,
      timestamp: nowIso(),
    }
  }

  if (pathname === "/market/screener") {
    return {
      stocks: nifty50Stocks.map(screenerStock),
      count: nifty50Stocks.length,
      timestamp: nowIso(),
      cached: true,
      cache_age_s: 0,
      local_fallback: true,
    }
  }

  if (pathname === "/news") {
    return {
      articles: [
        {
          title: "Nifty 50 local snapshot is available for dashboard analysis",
          link: "https://news.google.com/search?q=Nifty%2050%20market%20news",
          source: "SparkleAI Local",
          time: "Local fallback",
          category: "Market",
        },
        {
          title: "Banking and IT stocks drive the bundled local watchlist",
          link: "https://news.google.com/search?q=India%20banking%20IT%20stocks",
          source: "SparkleAI Local",
          time: "Local fallback",
          category: "Sector",
        },
        {
          title: "Connect BACKEND_API_URL for live news and market intelligence",
          link: "https://news.google.com/search?q=Indian%20stock%20market%20today",
          source: "SparkleAI Local",
          time: "Local fallback",
          category: "Business",
        },
      ],
      count: 3,
      timestamp: nowIso(),
      local_fallback: true,
    }
  }

  if (parts[0] === "price" && parts[1]) return priceFor(stockFor(parts[1]))

  if (parts[0] === "full" && parts[1]) {
    const stock = stockFor(parts[1])
    return {
      symbol: `${stock.symbol}.NS`,
      indicators: indicatorsFor(stock),
      signal: signalFor(stock),
      timestamp: nowIso(),
      local_fallback: true,
    }
  }

  if (parts[0] === "stock-info" && parts[1]) return stockInfoFor(stockFor(parts[1]))

  if (parts[0] === "fundamental" && parts.length === 3 && parts[2] === "list") {
    return reportsFor(decodeURIComponent(parts[1]))
  }

  if (parts[0] === "fundamental" && parts.length >= 4) {
    return fundamentalFor(decodeURIComponent(parts[1]), parts[2], decodeURIComponent(parts.slice(3).join("/")))
  }

  if (pathname === "/reports/list") {
    return {
      reports: [],
      total: 0,
      timestamp: nowIso(),
      local_fallback: true,
    }
  }

  return {
    error: "No local fallback is available for this API path.",
    path: pathname,
    timestamp: nowIso(),
  }
}

async function fetchFromBackend(request: NextRequest, pathname: string) {
  const target = new URL(pathname, BACKEND_API_URL)
  target.search = request.nextUrl.search

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  try {
    const response = await fetch(target, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: request.headers.get("accept") || "application/json" },
    })
    if (!response.ok) return null

    const headers = new Headers()
    const contentType = response.headers.get("content-type")
    if (contentType) headers.set("content-type", contentType)
    headers.set("cache-control", "no-store")
    headers.set("x-sparkle-data-source", "backend")

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params
  const pathname = `/${path.join("/")}`
  const backendResponse = await fetchFromBackend(request, pathname)
  if (backendResponse) return backendResponse

  return NextResponse.json(fallbackFor(pathname), {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "x-sparkle-data-source": "local-fallback",
    },
  })
}
