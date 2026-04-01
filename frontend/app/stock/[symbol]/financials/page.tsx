"use client"
import { use, useState } from "react"
import { StockSidebar } from "@/components/stock/stock-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Props { params: Promise<{ symbol: string }> }
const income=[{l:"Revenue",a:"₹2,45,678 Cr",b:"₹2,18,234 Cr",g:"+12.6%"},{l:"EBITDA",a:"₹63,333 Cr",b:"₹52,344 Cr",g:"+21.0%"},{l:"Net Profit",a:"₹31,982 Cr",b:"₹24,915 Cr",g:"+28.4%",h:true}]
const balance=[{l:"Total Assets",v:"₹14,56,789 Cr"},{l:"Total Liabilities",v:"₹7,23,456 Cr"},{l:"Equity",v:"₹7,33,333 Cr"},{l:"Total Debt",v:"₹2,34,567 Cr"},{l:"Cash",v:"₹1,12,345 Cr"},{l:"Net Debt",v:"₹1,22,222 Cr"}]
const cf=[{l:"Operating CF",v:"₹56,789 Cr",u:true},{l:"Capex",v:"-₹23,456 Cr",u:false},{l:"Free CF",v:"₹33,333 Cr",u:true},{l:"Net CF",v:"₹9,877 Cr",u:true}]

export default function FinancialsPage({params}:Props) {
  const {symbol}=use(params);const[tab,setTab]=useState("income")
  return(
    <div className="flex min-h-screen bg-background"><StockSidebar/><div className="flex flex-1 flex-col pl-[260px]"><main className="flex-1 p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">{symbol} Financials</h1><p className="text-sm text-muted-foreground">Income, Balance Sheet & Cash Flow</p></div>
      <div className="flex gap-2">{[{id:"income",l:"Income Statement"},{id:"balance",l:"Balance Sheet"},{id:"cashflow",l:"Cash Flow"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab===t.id?"bg-primary text-primary-foreground shadow-lg":"bg-secondary text-muted-foreground"}`}>{t.l}</button>)}</div>
      {tab==="income"&&<Card><CardHeader className="pb-3"><CardTitle>Income Statement</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr className="border-b border-border">{["","FY26","FY25","Growth"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead><tbody>{income.map((r,i)=><tr key={i} className={`border-b border-border/50 ${r.h?"bg-primary/5":""}`}><td className={`px-4 py-3 ${r.h?"font-bold text-primary":"font-medium"}`}>{r.l}</td><td className="px-4 py-3">{r.a}</td><td className="px-4 py-3 text-muted-foreground">{r.b}</td><td className="px-4 py-3 text-primary font-semibold">{r.g}</td></tr>)}</tbody></table></CardContent></Card>}
      {tab==="balance"&&<Card><CardHeader className="pb-3"><CardTitle>Balance Sheet (FY26)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">{balance.map((r,i)=><div key={i} className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground mb-1">{r.l}</p><p className="text-lg font-semibold">{r.v}</p></div>)}</div></CardContent></Card>}
      {tab==="cashflow"&&<Card><CardHeader className="pb-3"><CardTitle>Cash Flow (FY26)</CardTitle></CardHeader><CardContent className="space-y-3">{cf.map((r,i)=><div key={i} className="flex justify-between items-center rounded-lg bg-secondary/30 px-4 py-3"><span className="text-sm">{r.l}</span><div className="flex items-center gap-2">{r.u?<TrendingUp size={14} className="text-primary"/>:<TrendingDown size={14} className="text-destructive"/>}<span className={`font-semibold ${r.u?"text-primary":"text-destructive"}`}>{r.v}</span></div></div>)}</CardContent></Card>}
    </main></div></div>)
}
