"use client"

import { use, useEffect, useRef } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { getStockBySymbol } from "@/lib/stocks"

const TV_SYMBOLS: Record<string, string> = {
  "RELIANCE": "BSE:RELIANCE", "TCS": "BSE:TCS", "HDFCBANK": "BSE:HDFCBANK",
  "INFY": "BSE:INFY", "ICICIBANK": "BSE:ICICIBANK", "HINDUNILVR": "BSE:HINDUNILVR",
  "ITC": "BSE:ITC", "SBIN": "BSE:SBIN", "BHARTIARTL": "BSE:BHARTIARTL",
  "KOTAKBANK": "BSE:KOTAKBANK", "LT": "BSE:LT", "AXISBANK": "BSE:AXISBANK",
  "ASIANPAINT": "BSE:ASIANPAINT", "MARUTI": "BSE:MARUTI", "HCLTECH": "BSE:HCLTECH",
  "SUNPHARMA": "BSE:SUNPHARMA", "TITAN": "BSE:TITAN", "BAJFINANCE": "BSE:BAJFINANCE",
  "WIPRO": "BSE:WIPRO", "ULTRACEMCO": "BSE:ULTRACEMCO", "ONGC": "BSE:ONGC",
  "NTPC": "BSE:NTPC", "POWERGRID": "BSE:POWERGRID", "M&M": "BSE:M&M",
  "TATAMOTORS": "BSE:TATAMOTORS", "JSWSTEEL": "BSE:JSWSTEEL", "TATASTEEL": "BSE:TATASTEEL",
  "ADANIENT": "BSE:ADANIENT", "ADANIPORTS": "BSE:ADANIPORTS", "COALINDIA": "BSE:COALINDIA",
  "BPCL": "BSE:BPCL", "GRASIM": "BSE:GRASIM", "DRREDDY": "BSE:DRREDDY",
  "CIPLA": "BSE:CIPLA", "APOLLOHOSP": "BSE:APOLLOHOSP", "EICHERMOT": "BSE:EICHERMOT",
  "BAJAJFINSV": "BSE:BAJAJFINSV", "BAJAJ-AUTO": "BSE:BAJAJ-AUTO",
  "HEROMOTOCO": "BSE:HEROMOTOCO", "TECHM": "BSE:TECHM", "HINDALCO": "BSE:HINDALCO",
  "INDUSINDBK": "BSE:INDUSINDBK", "SBILIFE": "BSE:SBILIFE", "HDFCLIFE": "BSE:HDFCLIFE",
  "DIVISLAB": "BSE:DIVISLAB", "BRITANNIA": "BSE:BRITANNIA", "NESTLEIND": "BSE:NESTLEIND",
  "TATACONSUM": "BSE:TATACONSUM", "LTI": "BSE:LTIM", "SHREECEM": "BSE:SHREECEM",
}

function TradingViewChart({ symbol, height, studies, title, subtitle, badge }: {
  symbol: string; height: number; studies?: string[]; title: string; subtitle: string; badge?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ""

    const tvSymbol = TV_SYMBOLS[symbol] || `BSE:${symbol}`

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: height.toString(),
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: "rgba(20, 25, 36, 1)",
      gridColor: "rgba(37, 45, 61, 0.5)",
      studies: studies || [],
    })

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "100%"
    widgetDiv.style.width = "100%"

    ref.current.appendChild(widgetDiv)
    ref.current.appendChild(script)
  }, [symbol, studies])

  return (
    <div className="rounded-xl border border-[#252D3D] bg-[#141924] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#252D3D] px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-[#8B8B8B]">{subtitle}</p>
        </div>
        {badge && <span className="rounded-full bg-[#34D399]/10 px-3 py-1 text-xs font-medium text-[#34D399]">{badge}</span>}
      </div>
      <div ref={ref} className="tradingview-widget-container" style={{ height: `${height}px`, width: "100%" }} />
      <div className="border-t border-[#252D3D] px-6 py-2 text-center">
        <span className="text-xs text-[#8B8B8B]">
          Charts powered by <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="text-[#34D399] hover:underline">TradingView</a>
        </span>
      </div>
    </div>
  )
}

export default function ChartsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)
  const stock = getStockBySymbol(symbol)
  if (!stock) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Stock not found</div>

  const isPositive = stock.change >= 0

  return (
    <div className="flex min-h-screen bg-background">
      <StockSidebar />
      <div className="flex flex-1 flex-col pl-[260px]">
        <main className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{symbol} Charts</h1>
              <p className="text-sm text-muted-foreground">{stock.name} — Interactive Analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isPositive ? "bg-[#34D399]/10 text-[#34D399]" : "bg-[#F87171]/10 text-[#F87171]"}`}>
                {isPositive ? "+" : ""}{stock.change.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Price + Volume Chart */}
          <TradingViewChart
            symbol={symbol}
            height={750}
            studies={["Volume@tv-basicstudies"]}
            title="Price & Volume Chart"
            subtitle="Candlestick chart with volume overlay — BSE data"
            badge="Live"
          />

          {/* Technical Indicators Chart */}
          <TradingViewChart
            symbol={symbol}
            height={550}
            studies={["RSI@tv-basicstudies", "MACD@tv-basicstudies"]}
            title="Technical Indicators"
            subtitle="RSI + MACD overlays for momentum analysis"
          />
        </main>
      </div>
    </div>
  )
}
