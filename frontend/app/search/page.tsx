"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, EmptyState } from "@/components/ui/panel"
import { StockLogo } from "@/components/ui/stock-logo"
import { NewBadge } from "@/components/ui/new-badge"
import { useFreshReports } from "@/lib/hooks/useFreshReports"
import { nifty50Stocks } from "@/lib/stocks"
import { cn } from "@/lib/utils"

const SECTORS = ["All", ...Array.from(new Set(nifty50Stocks.map(s => s.sector))).sort()]

export default function AllStocksPage() {
  const [query, setQuery] = useState("")
  const [sector, setSector] = useState("All")
  const fresh = useFreshReports()
  useEffect(() => { document.title = "All stocks — SparkleAI" }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return nifty50Stocks
      .filter(s => sector === "All" || s.sector === sector)
      .filter(s => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [query, sector])

  return (
    <DashboardShell>
      <PageHeader title="All stocks" description="Every Nifty 50 company. Open one for live prices, signals and AI-read reports." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Symbol or company name"
            aria-label="Filter stocks"
            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-faint-foreground focus:border-primary/60 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none" role="group" aria-label="Sector">
          {SECTORS.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              aria-pressed={sector === s}
              className={cn(
                "h-9 shrink-0 rounded-md border px-3 text-sm transition-colors",
                sector === s ? "border-primary/50 bg-primary/10 text-primary" : "border-line text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "All" ? "All sectors" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Panel><EmptyState title="No stocks match">Try a different name, or clear the sector filter.</EmptyState></Panel>
      ) : (
        <Panel>
          <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
            {filtered.map(stock => (
              <li key={stock.symbol} className="sm:border-b sm:border-line">
                <Link href={`/stock/${encodeURIComponent(stock.symbol)}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                  <StockLogo symbol={stock.symbol} size={32} className="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">{stock.symbol}<NewBadge reports={fresh[stock.symbol]} /></span>
                    <span className="block truncate text-xs text-muted-foreground">{stock.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-faint-foreground">{stock.sector}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </DashboardShell>
  )
}
