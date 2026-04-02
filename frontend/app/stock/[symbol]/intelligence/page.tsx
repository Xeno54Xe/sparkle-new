"use client"

import { useState, use } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { FundamentalAnalysis } from "@/components/stock/fundamental-analysis"
import { TechnicalAnalysis } from "@/components/stock/technical-analysis"
import { Sparkles, BarChart3, Activity } from "lucide-react"

interface IntelligencePageProps {
  params: Promise<{ symbol: string }>
}

export default function IntelligencePage({ params }: IntelligencePageProps) {
  const { symbol } = use(params)
  const [activeTab, setActiveTab] = useState<"fundamental" | "technical">("fundamental")

  return (
    <div className="flex min-h-screen bg-background">
      {/* Stock Sidebar */}
      <StockSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col pl-[260px]">
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sparkle Intelligence</h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered analysis for {symbol}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 flex gap-2 rounded-xl bg-card p-1.5">
            <button
              onClick={() => setActiveTab("fundamental")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === "fundamental"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <BarChart3 size={18} />
              Fundamental Analysis
            </button>
            <button
              onClick={() => setActiveTab("technical")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === "technical"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Activity size={18} />
              Technical Analysis
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "fundamental" ? (
            <FundamentalAnalysis symbol={symbol} />
          ) : (
            <TechnicalAnalysis symbol={symbol} />
          )}
        </main>
      </div>
    </div>
  )
}
