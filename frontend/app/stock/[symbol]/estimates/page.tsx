"use client"
import { use, useEffect, useState } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { getStockBySymbol } from "@/lib/stocks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Users, Loader2 } from "lucide-react"
import { API_BASE } from "@/lib/api"

interface Props { params: Promise<{ symbol: string }> }
interface EstimatesData {
  consensus?: { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number }
  price_targets?: { low?: number; current?: number; mean?: number; median?: number; high?: number }
}

export default function EstimatesPage({params}:Props) {
  const {symbol}=use(params)
  const stock=getStockBySymbol(symbol)
  const [data,setData]=useState<EstimatesData|null>(null)
  const [loading,setLoading]=useState(true)

  useEffect(() => {
    document.title = `${symbol} Estimates — SparkleAI`
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/estimates/${encodeURIComponent(symbol)}.NS`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled) setData(j && !j.error ? j : null) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol])

  const c=data?.consensus
  const total=c?c.strong_buy+c.buy+c.hold+c.sell+c.strong_sell:0
  const pct=(n:number)=>total?Math.round((n/total)*100):0
  const consensus=c?[{l:"Strong Buy",c:c.strong_buy,cl:"#10B981"},{l:"Buy",c:c.buy,cl:"#34D399"},{l:"Hold",c:c.hold,cl:"#FBBF24"},{l:"Sell",c:c.sell,cl:"#F87171"},{l:"Strong Sell",c:c.strong_sell,cl:"#EF4444"}].map(x=>({...x,p:pct(x.c)})):[]
  const pt=data?.price_targets
  const price=pt?.current||stock?.price||0
  const targets=[{l:"High",v:pt?.high,cl:"#10B981"},{l:"Median",v:pt?.median,cl:"#34D399"},{l:"Average",v:pt?.mean,cl:"#FBBF24"},{l:"Low",v:pt?.low,cl:"#F87171"}]
  const upside=(v?:number)=>v&&price?((v-price)/price)*100:null

  return(
    <div className="flex min-h-screen bg-background"><StockSidebar/><div className="flex flex-1 flex-col lg:pl-[260px]"><main className="flex-1 p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">{symbol} Estimates</h1><p className="text-sm text-muted-foreground">Analyst consensus & price targets (live from Yahoo Finance)</p></div>
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 size={20} className="animate-spin"/> Loading estimates...</div>
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Users size={20}/>Analyst Consensus</CardTitle>{total>0&&<p className="text-xs text-muted-foreground">{total} analysts</p>}</CardHeader><CardContent className="space-y-3">{consensus.length===0||total===0?<p className="text-sm text-muted-foreground py-6 text-center">No analyst ratings available.</p>:consensus.map(c=><div key={c.l}><div className="flex justify-between text-sm mb-1"><span>{c.l}</span><span className="text-muted-foreground">{c.c} ({c.p}%)</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{width:`${c.p}%`,backgroundColor:c.cl}}/></div></div>)}</CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Target size={20}/>Price Targets</CardTitle></CardHeader><CardContent><div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Current</p><p className="text-2xl font-bold">{price?`₹${price.toFixed(2)}`:"N/A"}</p></div><div className="space-y-3">{targets.map(t=>{const u=upside(t.v);return<div key={t.l} className="flex justify-between items-center rounded-lg bg-secondary/30 px-4 py-3"><span className="text-sm">{t.l}</span><span className="font-semibold" style={{color:t.cl}}>{t.v?`₹${t.v.toFixed(2)}`:"N/A"}{u!=null&&<span className="ml-2 text-xs text-muted-foreground">({u>=0?"+":""}{u.toFixed(1)}%)</span>}</span></div>})}</div></CardContent></Card>
      </div>
      )}
    </main></div></div>)
}
