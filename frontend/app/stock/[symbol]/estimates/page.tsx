"use client"
import { use, useEffect, useState } from "react"
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { MarketLoader } from "@/components/ui/market-loader"

interface Props { params: Promise<{ symbol: string }> }
interface EstimatesData {
  consensus?: { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number }
  price_targets?: { low?: number; current?: number; mean?: number; median?: number; high?: number }
}

export default function EstimatesPage({params}:Props) {
  const {symbol:raw}=use(params)
  const symbol=decodeURIComponent(raw)
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
  const consensus=c?[{l:"Strong Buy",c:c.strong_buy,cl:"#2FB57C"},{l:"Buy",c:c.buy,cl:"#2FB57C"},{l:"Hold",c:c.hold,cl:"#F2A93B"},{l:"Sell",c:c.sell,cl:"#E35D5B"},{l:"Strong Sell",c:c.strong_sell,cl:"#E35D5B"}].map(x=>({...x,p:pct(x.c)})):[]
  const pt=data?.price_targets
  const price=pt?.current||0
  const targets=[{l:"Highest",v:pt?.high},{l:"Median",v:pt?.median},{l:"Average",v:pt?.mean},{l:"Lowest",v:pt?.low}]
  const upside=(v?:number)=>v&&price?((v-price)/price)*100:null

  const bar: Record<string, string> = { "Strong Buy": "bg-up", "Buy": "bg-up/60", "Hold": "bg-faint-foreground", "Sell": "bg-down/60", "Strong Sell": "bg-down" }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel aria-label="Analyst ratings">
        <PanelHeader title="Analyst ratings" description={total > 0 ? `${total} analysts, latest month` : "Latest month"} />
        {loading ? (
          <MarketLoader label="analyst ratings" />
        ) : total === 0 ? (
          <EmptyState title="No analyst ratings">No brokerages have published ratings for {symbol} on Yahoo Finance.</EmptyState>
        ) : (
          <div className="space-y-3.5 p-5">
            {consensus.map(c => (
              <div key={c.l} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{c.l}</span>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", bar[c.l])} style={{ width: `${c.p}%` }} />
                </div>
                <span className="text-right tabular text-foreground">{c.c} <span className="text-faint-foreground">({c.p}%)</span></span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel aria-label="Price targets">
        <PanelHeader title="12-month price targets" description={price ? `Against the current ₹${price.toFixed(2)}` : undefined} />
        {loading ? (
          <div className="space-y-4 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="h-6 animate-pulse rounded bg-surface-2" />)}</div>
        ) : !pt?.mean ? (
          <EmptyState title="No price targets">No analyst targets are published for {symbol}.</EmptyState>
        ) : (
          <dl className="divide-y divide-line">
            {targets.map(t => {
              const u = upside(t.v)
              return (
                <div key={t.l} className="flex items-baseline justify-between px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">{t.l}</dt>
                  <dd className="tabular">
                    <span className="text-foreground">{t.v ? `₹${t.v.toFixed(2)}` : "—"}</span>
                    {u != null && <span className={cn("ml-3 inline-block w-16 text-right", u >= 0 ? "text-up" : "text-down")}>{u >= 0 ? "+" : ""}{u.toFixed(1)}%</span>}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </Panel>
    </div>
  )
}
