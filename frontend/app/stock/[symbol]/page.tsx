"use client"

import { useState, useEffect, use } from "react"
import { notFound } from "next/navigation"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { StockInfo } from "@/components/stock/stock-info"
import { StockChart } from "@/components/stock/stock-chart"
import { KeyMetrics } from "@/components/stock/key-metrics"
import { FundamentalAnalysis } from "@/components/stock/fundamental-analysis"
import { getStockBySymbol } from "@/lib/stocks"
import { Skeleton } from "@/components/ui/skeleton"

interface StockPageProps {
  params: Promise<{ symbol: string }>
}

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = use(params)
  const stock = getStockBySymbol(symbol)
  
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        // Fetches from the new beginner.json structure
        const res = await fetch(`/api/stock/analysis?company=${symbol}&type=EC&period=FEB26`)
        const json = await res.json()
        setAnalysisData(json)
      } catch (err) {
        console.error("Analysis load failed", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [symbol])

  if (!stock) {
    notFound()
  }

  return (
    <div className="flex min-h-screen w-full relative">
      <StockSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px] w-full">
        <main className="flex-1 p-6 sm:p-8">
          <div className="space-y-6 max-w-[1600px] mx-auto w-full">
            <StockInfo stock={stock} />

            <StockChart
              symbol={stock.symbol}
              currentPrice={stock.price}
              change={stock.change}
            />

            <KeyMetrics stock={stock} />

            {/* Fundamental Analysis updated with new JSON callback */}
            {loading ? (
              <Skeleton className="h-[400px] w-full rounded-2xl" />
            ) : (
              <FundamentalAnalysis data={analysisData?.sections} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}