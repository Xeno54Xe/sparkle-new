import { Star, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockLogo } from "@/components/ui/stock-logo"

const watchlistStocks = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: "₹1,402.50", change: "+2.34%", isPositive: true, sparkline: [40,45,42,48,52,50,55,58,54,60] },
  { symbol: "TCS", name: "Tata Consultancy Services", price: "₹3,456.80", change: "+1.12%", isPositive: true, sparkline: [30,32,35,33,38,40,42,45,48,50] },
  { symbol: "INFY", name: "Infosys Limited", price: "₹1,542.25", change: "-0.45%", isPositive: false, sparkline: [50,48,52,50,46,45,43,42,40,38] },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: "₹1,678.90", change: "+0.87%", isPositive: true, sparkline: [35,38,36,40,42,45,44,48,50,52] },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: "₹642.15", change: "-1.23%", isPositive: false, sparkline: [60,58,55,52,50,48,45,42,40,38] },
]

function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const height = 24, width = 60
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(" ")
  return <svg width={width} height={height} className="shrink-0" aria-hidden="true"><polyline points={points} fill="none" stroke={isPositive ? "#34D399" : "#F87171"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function Watchlist() {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2"><Star size={18} className="text-primary" /><span className="text-sm font-semibold text-foreground">Watchlist</span></div>
        <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Plus size={16} /></button>
      </div>
      <div className="divide-y divide-border">
        {watchlistStocks.map((stock) => (
          <div key={stock.symbol} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50">
            <StockLogo symbol={stock.symbol} size={32} isPositive={stock.isPositive} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground">{stock.symbol}</span>
              <span className="truncate text-xs text-muted-foreground">{stock.name}</span>
            </div>
            <Sparkline data={stock.sparkline} isPositive={stock.isPositive} />
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{stock.price}</span>
              <span className={cn("text-xs font-medium", stock.isPositive ? "text-primary" : "text-destructive")}>{stock.change}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-border p-3 text-center">
        <button className="text-sm text-muted-foreground transition-colors hover:text-primary">View All</button>
      </div>
    </div>
  )
}
