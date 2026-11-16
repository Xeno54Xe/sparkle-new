import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AskChat } from "@/features/ask/components/ask-chat"
import { getStockBySymbol } from "@/lib/stocks"

export const metadata: Metadata = { title: "Ask Sparkle — SparkleAI" }

type AskPageProps = { searchParams: Promise<{ symbol?: string; q?: string }> }

export default async function AskPage({ searchParams }: AskPageProps) {
  const { symbol, q } = await searchParams
  const stock = symbol ? getStockBySymbol(symbol) : undefined
  return (
    <DashboardShell>
      {/* key: switching stock or question starts a fresh chat */}
      <AskChat key={`${stock?.symbol ?? ""}|${q ?? ""}`} symbol={stock?.symbol ?? null} initialQuestion={q?.slice(0, 1500) || null} />
    </DashboardShell>
  )
}
