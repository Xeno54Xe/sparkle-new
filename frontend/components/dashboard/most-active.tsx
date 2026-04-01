import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockLogo } from "@/components/ui/stock-logo"

const mostActiveStocks = [
  { rank: 1, symbol: "ADANIENT", name: "Adani Enterprises", volume: "24.8M", price: "₹2,456.30", change: "+5.67%", isPositive: true, sparkline: [30,35,40,45,50,55,60,65,70,75] },
  { rank: 2, symbol: "TATAMOTORS", name: "Tata Motors", volume: "18.2M", price: "₹642.15", change: "-1.23%", isPositive: false, sparkline: [60,58,55,52,50,48,45,42,40,38] },
  { rank: 3, symbol: "RELIANCE", name: "Reliance Industries", volume: "15.6M", price: "₹1,402.50", change: "+2.34%", isPositive: true, sparkline: [40,45,42,48,52,50,55,58,54,60] },
  { rank: 4, symbol: "HDFCBANK", name: "HDFC Bank", volume: "14.1M", price: "₹1,678.90", change: "+0.87%", isPositive: true, sparkline: [35,38,36,40,42,45,44,48,50,52] },
  { rank: 5, symbol: "INFY", name: "Infosys", volume: "12.4M", price: "₹1,542.25", change: "-0.45%", isPositive: false, sparkline: [50,48,52,50,46,45,43,42,40,38] },
]

function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const height = 24, width = 50
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ")
  return <svg width={width} height={height} className="shrink-0" aria-hidden="true"><polyline points={points} fill="none" stroke={isPositive ? "#34D399" : "#F87171"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function MostActive() {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2"><Flame size={18} className="text-[#FBBF24]" /><span className="text-sm font-semibold text-foreground">Most Active</span></div>
        <button className="text-xs text-muted-foreground transition-colors hover:text-primary">See all</button>
      </div>
      <div className="divide-y divide-border">
        {mostActiveStocks.map((stock) => (
          <div key={stock.symbol} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50">
            <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold", stock.rank <= 3 ? "bg-[#FBBF24]/20 text-[#FBBF24]" : "bg-secondary text-muted-foreground")}>{stock.rank}</div>
            <StockLogo symbol={stock.symbol} size={28} isPositive={stock.isPositive} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground">{stock.symbol}</span>
              <span className="truncate text-xs text-muted-foreground">Vol: {stock.volume}</span>
            </div>
            <Sparkline data={stock.sparkline} isPositive={stock.isPositive} />
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{stock.price}</span>
              <span className={cn("text-xs font-medium", stock.isPositive ? "text-primary" : "text-destructive")}>{stock.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
