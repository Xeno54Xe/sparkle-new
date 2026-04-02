"use client"
import Link from "next/link"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Star, Plus, TrendingUp, TrendingDown } from "lucide-react"

const watchlist = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 1402.50, change: 2.34, sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3456.80, change: 1.12, sector: "IT" },
  { symbol: "INFY", name: "Infosys", price: 1542.25, change: -0.45, sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1678.90, change: 0.87, sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 642.15, change: -1.23, sector: "Automobile" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2456.30, change: 5.67, sector: "Conglomerate" },
]

export default function WatchlistPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px]">
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
                  <Star size={24} className="text-primary relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50"></div>
                </div>
                <span className="text-gradient">Watchlist</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">{watchlist.length} stocks tracked</p>
            </div>
            <button className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              <Plus size={18} className="transition-transform group-hover:rotate-90" /> Add Stock
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-left text-xs text-muted-foreground uppercase tracking-wider"><th className="p-5 font-semibold">Stock</th><th className="p-5 font-semibold">Sector</th><th className="p-5 font-semibold">Price</th><th className="p-5 font-semibold">Change</th><th className="p-5 font-semibold">Action</th></tr></thead>
              <tbody>{watchlist.map(s => (
                <tr key={s.symbol} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-all duration-200">
                  <td className="p-5"><Link href={`/stock/${s.symbol}`} className="group flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-transform group-hover:scale-110 ${s.change >= 0 ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-destructive/20 text-destructive border border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}>{s.symbol.slice(0,2)}</div>
                    <div><p className="font-semibold text-foreground group-hover:text-primary transition-colors">{s.symbol}</p><p className="text-xs text-muted-foreground">{s.name}</p></div>
                  </Link></td>
                  <td className="p-5"><span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground border border-white/5">{s.sector}</span></td>
                  <td className="p-5 font-semibold text-foreground">₹{s.price.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
                  <td className={`p-5 font-bold ${s.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    <span className="flex items-center gap-1.5">{s.change >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}{s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%</span>
                  </td>
                  <td className="p-5"><Link href={`/stock/${s.symbol}/intelligence`} className="inline-flex rounded-lg bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:scale-105 border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Analyze</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
