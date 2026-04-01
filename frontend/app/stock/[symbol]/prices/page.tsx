"use client"
import { use } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { getStockBySymbol } from "@/lib/stocks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Props { params: Promise<{ symbol: string }> }

export default function PricesPage({params}:Props) {
  const {symbol} = use(params)
  const stock = getStockBySymbol(symbol)
  const base = stock?.price||1000
  const prices = Array.from({length:20},(_,i) => {const d=new Date();d.setDate(d.getDate()-i);const chg=(Math.random()-0.5)*base*0.03;const o=base+(Math.random()-0.5)*base*0.01;return{date:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),open:o.toFixed(2),high:(Math.max(o,base)+Math.random()*base*0.01).toFixed(2),low:(Math.min(o,base)-Math.random()*base*0.01).toFixed(2),close:base.toFixed(2),change:chg,volume:Math.floor(Math.random()*1e7+2e6)}})
  return (
    <div className="flex min-h-screen bg-background"><StockSidebar /><div className="flex flex-1 flex-col pl-[260px]"><main className="flex-1 p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">{symbol} Price History</h1><p className="text-sm text-muted-foreground">Historical OHLCV data</p></div>
      <Card><CardHeader className="pb-3"><CardTitle>Daily Prices</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border">{["Date","Open","High","Low","Close","Change","Volume"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead><tbody>{prices.map((p,i)=>{const up=p.change>=0;return(<tr key={i} className="border-b border-border/50 hover:bg-secondary/30"><td className="px-4 py-3 font-medium">{p.date}</td><td className="px-4 py-3">₹{p.open}</td><td className="px-4 py-3 text-primary">₹{p.high}</td><td className="px-4 py-3 text-destructive">₹{p.low}</td><td className="px-4 py-3 font-semibold">₹{p.close}</td><td className="px-4 py-3"><div className={`flex items-center gap-1 ${up?"text-primary":"text-destructive"}`}>{up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}<span className="font-medium">{up?"+":""}{p.change.toFixed(2)}</span></div></td><td className="px-4 py-3 text-muted-foreground">{(p.volume/1e6).toFixed(2)}M</td></tr>)})}</tbody></table></div></CardContent></Card>
    </main></div></div>)
}
