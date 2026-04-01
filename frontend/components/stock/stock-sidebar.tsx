"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  LayoutDashboard,
  Sparkles,
  LineChart,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  ArrowLeft,
} from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"

const stockNavItems = [
  { icon: LayoutDashboard, label: "Overview", href: "" },
  { icon: Sparkles, label: "Sparkle Intelligence", href: "/intelligence" },
  { icon: LineChart, label: "Charts", href: "/charts" },
  { icon: DollarSign, label: "Prices", href: "/prices" },
  { icon: FileSpreadsheet, label: "Financials", href: "/financials" },
  { icon: TrendingUp, label: "Estimates", href: "/estimates" },
  { icon: CreditCard, label: "Credit Analysis", href: "/credit-analysis" },
]

export function StockSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const symbol = params.symbol as string

  const isActive = (href: string) => {
    const fullPath = `/stock/${symbol}${href}`
    if (href === "") {
      return pathname === `/stock/${symbol}`
    }
    return pathname === fullPath
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/5 glass">
      <div className="flex h-16 items-center border-b border-white/5 px-4">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-all hover:text-foreground hover:-translate-x-1">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
      </div>
      <div className="border-b border-white/5 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center justify-center">
            <StockLogo symbol={symbol} fallbackClassName="text-lg text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground tracking-tight">{symbol}</h2>
            <p className="text-xs text-primary/80 font-medium">Stock Analysis</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <ul className="space-y-1.5">
          {stockNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.label}>
                <Link href={`/stock/${symbol}${item.href}`} className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  active ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:translate-x-1"
                }`}>
                  {active && <span className="absolute left-0 top-1/2 h-8 w-[4px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                  <Icon size={18} className={`transition-colors ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-white/5 p-4 bg-black/20">
        <div className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-white/5 cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Sparkles size={18} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground text-gradient-primary tracking-wide">SparkleAI</p>
            <p className="text-xs text-muted-foreground">Pro Analysis Active</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
