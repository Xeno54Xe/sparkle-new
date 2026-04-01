"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Search, TrendingUp, TrendingDown } from "lucide-react"
import { nifty50Stocks } from "@/lib/stocks"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    if (!query) return nifty50Stocks
    const q = query.toLowerCase()
    return nifty50Stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px]">
        <main className="flex-1 p-6 sm:p-8">
          <h1 className="text-3xl font-bold mb-2 text-gradient">Search Stocks</h1>
          <p className="text-sm text-muted-foreground mb-8">Browse all Nifty 50 stocks with AI-powered insights</p>
          <div className="relative max-w-2xl mb-8 group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 to-emerald-400/30 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by symbol or company name..."
              className="relative h-14 w-full rounded-xl border border-white/10 glass-card pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-all" />
          </div>
          <p className="text-xs font-semibold text-primary/80 mb-4 uppercase tracking-wider">{filtered.length} of {nifty50Stocks.length} results</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(stock => (
              <Link key={stock.symbol} href={`/stock/${stock.symbol}`}
                className="glass-card glass-card-hover group flex items-center justify-between rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-transform group-hover:scale-110 ${stock.change >= 0 ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-destructive/20 text-destructive border border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]'}`}>
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className={`flex items-center justify-end gap-1 text-xs font-bold mt-1 ${stock.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
