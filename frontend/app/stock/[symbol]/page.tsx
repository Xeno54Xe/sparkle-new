import { notFound } from "next/navigation"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { StockInfo } from "@/components/stock/stock-info"
import { StockChart } from "@/components/stock/stock-chart"
import { KeyMetrics } from "@/components/stock/key-metrics"
import { FundamentalAnalysis } from "@/components/stock/fundamental-analysis"
import { getStockBySymbol } from "@/lib/stocks"

interface StockPageProps {
  params: Promise<{ symbol: string }>
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params
  const stock = getStockBySymbol(symbol)

  if (!stock) {
    notFound()
  }

  return (
    <div className="flex min-h-screen w-full relative">
      <StockSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px] w-full">
        <main className="flex-1 p-6 sm:p-8">
          <div className="space-y-6 max-w-[1600px] mx-auto w-full">
            {/* Stock Info Header */}
            <StockInfo stock={stock} />

            {/* Price Chart */}
            <StockChart
              symbol={stock.symbol}
              currentPrice={stock.price}
              change={stock.change}
            />

            {/* Key Metrics */}
            <KeyMetrics stock={stock} />

            {/* Fundamental Analysis */}
            <FundamentalAnalysis symbol={stock.symbol} />
          </div>
        </main>
      </div>
    </div>
  )
}
