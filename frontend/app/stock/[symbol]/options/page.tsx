import { notFound } from "next/navigation"
import { getStockBySymbol } from "@/lib/stocks"
import { withDemoPrice } from "@/lib/demo-prices"
import { OptionsStrategiesPanel } from "@/features/options-strategies/components/options-strategies-panel"

type OptionsPageProps = {
  params: Promise<{ symbol: string }>
}

const optionsStrategiesEnabled = process.env.NEXT_PUBLIC_OPTIONS_STRATEGIES_ENABLED === "true"

export async function generateMetadata({ params }: OptionsPageProps) {
  const { symbol } = await params
  return { title: `${decodeURIComponent(symbol)} Options — SparkleAI` }
}

export default async function OptionsPage({ params }: OptionsPageProps) {
  if (!optionsStrategiesEnabled) notFound()
  const { symbol } = await params
  const stock = getStockBySymbol(decodeURIComponent(symbol))
  if (!stock) notFound()
  return <OptionsStrategiesPanel stock={withDemoPrice(stock)} />
}
