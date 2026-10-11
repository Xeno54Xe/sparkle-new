"use client"

import { useState, useEffect, use } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { FundamentalAnalysis } from "@/components/stock/fundamental-analysis"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  params: Promise<{ symbol: string }>
}

export default function IntelligencePage({ params }: Props) {
  const { symbol } = use(params)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/stock/analysis?company=${symbol}&type=EC&period=FEB26`)
        const json = await res.json()
        setAnalysisData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [symbol])

  return (
    <div className="flex min-h-screen w-full relative">
      <StockSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px] w-full">
        <main className="flex-1 p-8">
          <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">
                Sparkle <span className="text-primary">Intelligence</span>
              </h1>
              <p className="text-muted-foreground">AI-Powered Fundamental Analysis & Sectional Scores</p>
            </div>

            {loading ? (
              <Skeleton className="h-[600px] w-full rounded-2xl" />
            ) : (
              <FundamentalAnalysis data={analysisData?.sections} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}