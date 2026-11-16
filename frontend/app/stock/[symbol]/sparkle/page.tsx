"use client"

import { use, useEffect } from "react"
import { SparkleReportView } from "@/components/stock/sparkle-report"

export default function SparkleReportPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = use(params)
  const symbol = decodeURIComponent(raw)
  useEffect(() => { document.title = `${symbol} Sparkle Report — SparkleAI` }, [symbol])
  return <SparkleReportView symbol={symbol} />
}
