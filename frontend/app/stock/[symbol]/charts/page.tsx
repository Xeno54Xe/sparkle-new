"use client"

import { use, useEffect } from "react"
import { TradingViewChart } from "@/components/stock/tradingview-chart"

export default function ChartsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  useEffect(() => { document.title = `${symbol} Charts — SparkleAI` }, [symbol])

  return (
    <div className="space-y-6">
      <TradingViewChart
        symbol={symbol}
        height={680}
        studies={["Volume@tv-basicstudies"]}
        title="Price and volume"
        description="Daily candles. Use the toolbar to change interval or draw."
      />
      <TradingViewChart
        symbol={symbol}
        height={520}
        studies={["RSI@tv-basicstudies", "MACD@tv-basicstudies"]}
        title="Momentum"
        description="RSI (14) and MACD (12, 26, 9) below the price"
      />
    </div>
  )
}
