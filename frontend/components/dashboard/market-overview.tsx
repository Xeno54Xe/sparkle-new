import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

const indices = [
  {
    symbol: "N",
    name: "Nifty 50",
    value: "22,456.10",
    change: "+1.23%",
    isPositive: true,
  },
  {
    symbol: "S",
    name: "Sensex",
    value: "73,890.45",
    change: "+1.67%",
    isPositive: true,
  },
  {
    symbol: "B",
    name: "Bank Nifty",
    value: "48,234.60",
    change: "-0.32%",
    isPositive: false,
  },
]

export function MarketOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {indices.map((index) => (
        <div
          key={index.name}
          className="group flex flex-col justify-center gap-4 rounded-2xl glass-card border-white/10 p-5 glass-card-hover relative overflow-hidden"
        >
          {/* Subtle gradient orb in background */}
          <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40", index.isPositive ? "bg-primary" : "bg-destructive")} />
          
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-lg transition-transform duration-300 group-hover:scale-110",
                index.isPositive
                  ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-primary/20"
                  : "bg-destructive/20 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-destructive/20"
              )}
            >
              {index.symbol}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{index.name}</span>
              <span className="text-2xl font-bold text-foreground tracking-tight">
                {index.value}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    index.isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {index.isPositive ? (
                    <TrendingUp size={12} className="text-primary" />
                  ) : (
                    <TrendingDown size={12} className="text-destructive" />
                  )}
                  {index.change}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
