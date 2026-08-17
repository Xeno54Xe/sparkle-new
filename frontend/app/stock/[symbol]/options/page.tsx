import { notFound } from "next/navigation"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { getStockBySymbol } from "@/lib/stocks"
import { OptionsStrategiesPanel } from "@/features/options-strategies/components/options-strategies-panel"

type OptionsPageProps = {
  params: Promise<{ symbol: string }>
}

const optionsStrategiesEnabled = process.env.NEXT_PUBLIC_OPTIONS_STRATEGIES_ENABLED === "true"

export async function generateMetadata({ params }: OptionsPageProps) {
  const { symbol } = await params
  return { title: `${symbol} Options Strategies — SparkleAI` }
}

export default async function OptionsPage({ params }: OptionsPageProps) {
  if (!optionsStrategiesEnabled) notFound()

  const { symbol } = await params
  const stock = getStockBySymbol(symbol)
  if (!stock) notFound()

  return (
    <div className="flex min-h-screen bg-background">
      <StockSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <OptionsStrategiesPanel stock={stock} />
          </div>
        </main>
      </div>
    </div>
  )
}
