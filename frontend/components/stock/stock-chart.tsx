"use client"

import { useState, useEffect, useRef } from "react"

interface StockChartProps {
  symbol: string
  currentPrice: number
  change: number
}

// TradingView symbol mapping for Indian stocks
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

export function StockChart({ symbol, currentPrice, change }: StockChartProps) {
  const [tvError, setTvError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPositive = change >= 0

  const tvSymbol = TV_SYMBOLS[symbol] || `BSE:${symbol}`

  // Load TradingView widget
  useEffect(() => {
    if (!containerRef.current) return
    setTvError(false)
    containerRef.current.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: "700",
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
      studies: ["Volume@tv-basicstudies"],
    })

    script.onerror = () => setTvError(true)

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "100%"
    widgetDiv.style.width = "100%"

    containerRef.current.appendChild(widgetDiv)
    containerRef.current.appendChild(script)
  }, [symbol, tvSymbol])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden glass-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
          <p className="text-sm text-muted-foreground">{symbol} — NSE/BSE</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">
            ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {isPositive ? "+" : ""}{change.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* TradingView Chart */}
      <div ref={containerRef} className="tradingview-widget-container" style={{ height: "700px", width: "100%" }} />
      {tvError && (
        <div className="flex items-center justify-center h-[700px] text-muted-foreground">
          <div className="text-center">
            <p className="text-sm mb-2">TradingView chart unavailable for this symbol</p>
          </div>
        </div>
      )}
      <div className="border-t border-border px-6 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          Charts powered by <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TradingView</a>
        </span>
      </div>
    </div>
  )
}
