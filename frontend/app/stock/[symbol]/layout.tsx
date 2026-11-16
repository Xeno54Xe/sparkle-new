import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StockHeader } from "@/components/stock/stock-header"
import { getStockBySymbol } from "@/lib/stocks"

export default async function StockLayout({ children, params }: { children: ReactNode; params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const stock = getStockBySymbol(decodeURIComponent(symbol))
  if (!stock) notFound()

  return (
    <DashboardShell header={<StockHeader stock={stock} />}>
      {children}
    </DashboardShell>
  )
}
