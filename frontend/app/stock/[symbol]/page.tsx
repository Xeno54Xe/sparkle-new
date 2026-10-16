import { TradingViewChart } from "@/components/stock/tradingview-chart"
import { KeyMetrics } from "@/components/stock/key-metrics"
import { getStockBySymbol } from "@/lib/stocks"

interface StockPageProps {
  params: Promise<{ symbol: string }>
}

export async function generateMetadata({ params }: StockPageProps) {
  const { symbol } = await params
  return { title: `${decodeURIComponent(symbol)} — SparkleAI` }
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params
  const stock = getStockBySymbol(decodeURIComponent(symbol))!

  return (
    <div className="space-y-6">
      <TradingViewChart
        symbol={stock.symbol}
        height={520}
        studies={["Volume@tv-basicstudies"]}
        title="Price"
        description="Daily candles with volume"
      />
      <KeyMetrics stock={stock} />
    </div>
  )
}
