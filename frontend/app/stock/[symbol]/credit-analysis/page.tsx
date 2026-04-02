"use client"
import { use } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, AlertTriangle, TrendingUp } from "lucide-react"

interface Props { params: Promise<{ symbol: string }> }

export default function CreditPage({params}:Props) {
  const {symbol}=use(params)
  return(
    <div className="flex min-h-screen bg-background"><StockSidebar/><div className="flex flex-1 flex-col pl-[260px]"><main className="flex-1 p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">{symbol} Credit Analysis</h1><p className="text-sm text-muted-foreground">Debt profile & solvency</p></div>
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">Credit Rating</p><p className="text-4xl font-bold text-primary">A-</p><p className="text-sm text-muted-foreground mt-1">S&P Global</p></div><div className="text-right"><div className="flex items-center gap-2 text-primary"><TrendingUp size={16}/><span className="text-sm font-semibold">Upgraded from BBB+</span></div><p className="text-xs text-muted-foreground mt-1">Outlook: Stable</p></div></div></CardContent></Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Shield size={20}/>Debt Metrics</CardTitle></CardHeader><CardContent className="space-y-3">{[{l:"Total Debt",v:"₹2,34,567 Cr"},{l:"Net Debt",v:"₹1,22,222 Cr"},{l:"D/E Ratio",v:"0.32"},{l:"Debt/EBITDA",v:"1.8x"},{l:"Interest Coverage",v:"12.5x"},{l:"Current Ratio",v:"1.63"},{l:"Quick Ratio",v:"1.21"},{l:"Cash",v:"₹1,12,345 Cr"}].map(m=><div key={m.l} className="flex justify-between items-center rounded-lg bg-secondary/30 px-4 py-3"><span className="text-sm text-muted-foreground">{m.l}</span><span className="text-sm font-semibold">{m.v}</span></div>)}</CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><AlertTriangle size={20}/>Solvency</CardTitle></CardHeader><CardContent className="space-y-4">{[{l:"Short-term",s:85,lb:"Strong",c:"#10B981"},{l:"Long-term",s:78,lb:"Good",c:"#34D399"},{l:"Debt Service",s:82,lb:"Strong",c:"#10B981"},{l:"Liquidity",s:71,lb:"Adequate",c:"#FBBF24"}].map(s=><div key={s.l}><div className="flex justify-between mb-2"><span className="text-sm">{s.l}</span><span className="text-sm font-semibold" style={{color:s.c}}>{s.lb} ({s.s}/100)</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.s}%`,backgroundColor:s.c}}/></div></div>)}<div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-4"><p className="text-sm font-medium text-primary mb-1">Assessment</p><p className="text-xs text-muted-foreground leading-relaxed">Healthy debt profile with strong interest coverage. S&P upgrade reflects shift towards less cyclical businesses.</p></div></CardContent></Card>
      </div>
    </main></div></div>)
}
