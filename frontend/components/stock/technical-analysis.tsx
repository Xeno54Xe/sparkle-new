"use client"

import { useState, useEffect } from "react"
import { BarChart2, Zap, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TechnicalAnalysisProps { symbol: string }
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function calcVerdict(d: any) {
  const p = d.price || 0
  const ts = ([p > d.SMA50, p > d.SMA200, p > d.EMA20, p > d.EMA9, p > d.ichimokuTenkan, p > d.ichimokuKijun].filter(Boolean).length / 6) * 100
  const ms = ([d.MACD > d.MACDSignal, d.MACDHist > 0, d.ROC > 0, d.ADX > 25].filter(Boolean).length / 4) * 100
  const rf = (v: number, lo: number, hi: number) => v < lo ? 1 : v > hi ? 0 : 0.5
  const os = (([rf(d.RSI,30,70), rf(d.stochK,20,80), rf(d.CCI,-100,100), rf(d.WilliamsR,-80,-20), rf(d.MFI,20,80)].reduce((a:number,b:number)=>a+b,0))/5)*100
  const vs = ([p > d.VWAP, d.OBV > 0].filter(Boolean).length / 2) * 100
  const cb = d.candle?.type === "bullish" ? 1 : d.candle?.type === "bearish" ? 0 : 0.5
  const cv = Object.values(d.crossovers || {})
  const csc = cv.filter((x: any) => x.status === "Bullish").length / (cv.length || 1)
  const pscore = ((cb + csc) / 2) * 100
  const ov = Math.round(ts*0.25 + ms*0.25 + os*0.2 + vs*0.15 + pscore*0.15)
  const buys = [p>d.SMA50, p>d.SMA200, p>d.EMA20, p>d.VWAP, d.MACD>d.MACDSignal, d.ROC>0].filter(Boolean).length
  const sells = [p<d.SMA50, p<d.SMA200, p<d.EMA20, p<d.VWAP, d.MACD<d.MACDSignal, d.ROC<0, d.RSI>70, d.stochK>80, d.CCI>100, d.WilliamsR>-20, d.MFI>80].filter(Boolean).length
  return { ov, ts: Math.round(ts), ms: Math.round(ms), os: Math.round(os), vs: Math.round(vs), ps: Math.round(pscore), buys, sells, n: 11-buys-sells, sig: ov>=60?"BUY":ov<=40?"SELL":"HOLD" }
}

const sc = (t: string) => t==="BUY"||t==="STRONG"||t==="bullish"?"#34D399":t==="SELL"||t==="bearish"?"#F87171":"#FBBF24"
const sbb = (t: string) => sc(t)+"15"
const bc = (s: number) => s<35?"#EF4444":s<55?"#FBBF24":"#34D399"

export function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const [subTab, setSubTab] = useState<"overview"|"indicators"|"events">("overview")
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { (async () => { setLoading(true); try { const r = await fetch(`${API}/full/${symbol}.NS`); if(r.ok){const t=await r.text();try{const j=JSON.parse(t);if(j.indicators)setD(j.indicators)}catch{}} } catch(e){console.error(e)} setLoading(false) })() }, [symbol])

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 size={20} className="animate-spin"/> Loading...</div>
  if (!d) return <div className="text-center py-20 text-muted-foreground">No technical data for {symbol}</div>

  const v = calcVerdict(d)
  const crossovers = Object.values(d.crossovers||{}) as any[]

  const n1 = (v: number|null|undefined) => v != null ? v.toFixed(1) : undefined
  const n2 = (v: number|null|undefined) => v != null ? v.toFixed(2) : undefined
  const inr = (v: number|null|undefined) => v != null ? "INR " + v.toFixed(2) : undefined

  const indicators = [
    {n:"RSI (14)",v:n1(d.RSI),s:d.RSI!=null?(d.RSI<30?"BUY":d.RSI>70?"SELL":"NEUTRAL"):"NEUTRAL",ds:"Momentum"},
    {n:"MACD",v:n2(d.MACD),s:d.MACD!=null&&d.MACDSignal!=null?(d.MACD>d.MACDSignal?"BUY":"SELL"):"NEUTRAL",ds:d.MACD!=null&&d.MACDSignal!=null?(d.MACD>d.MACDSignal?"Bullish":"Bearish"):"—"},
    {n:"SMA 50",v:inr(d.SMA50),s:d.SMA50!=null?(d.price>d.SMA50?"BUY":"SELL"):"NEUTRAL",ds:d.SMA50!=null?(d.price>d.SMA50?"Above":"Below"):"—"},
    {n:"SMA 200",v:inr(d.SMA200),s:d.SMA200!=null?(d.price>d.SMA200?"BUY":"SELL"):"NEUTRAL",ds:d.SMA200!=null?(d.price>d.SMA200?"Uptrend":"Downtrend"):"—"},
    {n:"ADX",v:n1(d.ADX),s:d.ADX!=null?(d.ADX>25?"STRONG":"WEAK"):"NEUTRAL",ds:d.ADX!=null?(d.ADX>25?"Strong":"Weak"):"—"},
    {n:"Stoch %K",v:n1(d.stochK),s:d.stochK!=null?(d.stochK<20?"BUY":d.stochK>80?"SELL":"NEUTRAL"):"NEUTRAL",ds:"Oscillator"},
    {n:"CCI",v:n1(d.CCI),s:d.CCI!=null?(d.CCI>100?"SELL":d.CCI<-100?"BUY":"NEUTRAL"):"NEUTRAL",ds:"Cycle"},
    {n:"W %R",v:n1(d.WilliamsR),s:d.WilliamsR!=null?(d.WilliamsR>-20?"SELL":d.WilliamsR<-80?"BUY":"NEUTRAL"):"NEUTRAL",ds:"Range"},
    {n:"MFI",v:n1(d.MFI),s:d.MFI!=null?(d.MFI>80?"SELL":d.MFI<20?"BUY":"NEUTRAL"):"NEUTRAL",ds:"Flow"},
    {n:"ROC",v:d.ROC!=null?d.ROC.toFixed(1)+"%":undefined,s:d.ROC!=null?(d.ROC>0?"BUY":"SELL"):"NEUTRAL",ds:"Rate"},
    {n:"EMA 20",v:inr(d.EMA20),s:d.EMA20!=null?(d.price>d.EMA20?"BUY":"SELL"):"NEUTRAL",ds:"Short-term"},
    {n:"VWAP",v:inr(d.VWAP),s:d.VWAP!=null?(d.price>d.VWAP?"BUY":"SELL"):"NEUTRAL",ds:"Volume-wtd"},
  ].filter(ind => ind.v !== undefined)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">{(["overview","indicators","events"] as const).map(t=>(<button key={t} onClick={()=>setSubTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${subTab===t?"bg-primary text-primary-foreground shadow-lg":"bg-secondary text-muted-foreground hover:text-foreground"}`}>{t}</button>))}</div>

      {subTab==="overview" && (<div className="space-y-6">
        {/* Verdict Gauge */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent"><CardContent className="pt-6"><div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold tracking-[3px] text-muted-foreground mb-4">TECHNICAL VERDICT</p>
          <div className="relative w-48 h-28 mb-2"><svg viewBox="0 0 200 110" className="w-full h-full">{[{a:-90,b:-54,c:"#EF4444"},{a:-50,b:-18,c:"#F97316"},{a:-14,b:14,c:"#FBBF24"},{a:18,b:50,c:"#84CC16"},{a:54,b:90,c:"#10B981"}].map(({a,b,c},i)=>{const tr=(deg:number)=>((deg-90)*Math.PI)/180;return<path key={i} d={`M ${100+72*Math.cos(tr(a))} ${100+72*Math.sin(tr(a))} A 72 72 0 0 1 ${100+72*Math.cos(tr(b))} ${100+72*Math.sin(tr(b))}`} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" opacity={0.8}/>})}{(()=>{const na=-90+(v.ov/100)*180,nr=((na-90)*Math.PI)/180;return<line x1={100} y1={100} x2={100+54*Math.cos(nr)} y2={100+54*Math.sin(nr)} stroke="white" strokeWidth="3" strokeLinecap="round"/>})()}<circle cx={100} cy={100} r={4} fill="white"/></svg></div>
          <p className="text-4xl font-bold">{v.ov}</p>
          <p className="text-sm font-semibold mt-1" style={{color:sc(v.sig)}}>{v.ov>=60?"Bullish":v.ov<=40?"Bearish":"Neutral"}</p>
          <div className="inline-flex mt-3 rounded-full px-5 py-2 text-sm font-bold" style={{backgroundColor:sbb(v.sig),color:sc(v.sig)}}>{v.sig}</div>
          <div className="flex gap-8 mt-4">{[{c:"#34D399",val:v.buys,l:"Buy"},{c:"#F87171",val:v.sells,l:"Sell"},{c:"#FBBF24",val:v.n,l:"Neutral"}].map(i=>(<div key={i.l} className="text-center"><p className="text-xl font-bold" style={{color:i.c}}>{i.val}</p><p className="text-xs text-muted-foreground">{i.l}</p></div>))}</div>
        </div></CardContent></Card>

        {/* Verdict Breakdown */}
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BarChart2 size={20}/> Verdict Breakdown</CardTitle></CardHeader><CardContent className="space-y-4">
          {[{n:"Trend (25%)",s:v.ts,f:"SMA50, SMA200, EMA20, EMA9, Ichimoku"},{n:"Momentum (25%)",s:v.ms,f:"MACD, Hist, ROC, ADX"},{n:"Oscillators (20%)",s:v.os,f:"RSI, Stoch, CCI, W%R, MFI"},{n:"Volume (15%)",s:v.vs,f:"VWAP, OBV"},{n:"Patterns (15%)",s:v.ps,f:"Candle, Crossovers"}].map((c,i)=>(<div key={i}><div className="flex justify-between mb-1"><span className="text-sm font-medium">{c.n}</span><span className="text-sm font-bold" style={{color:bc(c.s)}}>{c.s}</span></div><div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{width:`${c.s}%`,backgroundColor:bc(c.s)}}/></div><p className="text-xs text-muted-foreground mt-1">{c.f}</p></div>))}
        </CardContent></Card>

        {/* Candlestick Pattern + MA Crossovers */}
        <div className="grid gap-6 lg:grid-cols-2">
          {d.candle&&(<Card><CardHeader className="pb-3"><CardTitle>Candlestick Pattern</CardTitle></CardHeader><CardContent><div className="flex justify-between mb-3"><span className="text-lg font-bold">{d.candle.latest}</span><span className="rounded-full px-3 py-1 text-xs font-semibold capitalize" style={{backgroundColor:sbb(d.candle.type),color:sc(d.candle.type)}}>{d.candle.type}</span></div><p className="text-sm text-muted-foreground">{d.candle.description}</p><p className="text-xs text-muted-foreground mt-2">Reliability: <span className="font-semibold text-foreground">{d.candle.reliability}</span></p></CardContent></Card>)}
          {crossovers.length>0&&(<Card><CardHeader className="pb-3"><CardTitle>MA Crossovers</CardTitle></CardHeader><CardContent className="space-y-2">{crossovers.map((cr:any,i:number)=>(<div key={i} className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div><p className="text-sm font-medium">{cr.name}</p><p className="text-xs text-muted-foreground">{cr.daysAgo}d ago</p></div><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{backgroundColor:sbb(cr.status==="Bullish"?"bullish":"bearish"),color:sc(cr.status==="Bullish"?"bullish":"bearish")}}>{cr.status}</span></div>))}</CardContent></Card>)}
        </div>
      </div>)}

      {subTab==="indicators"&&(<div className="space-y-6">
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Zap size={20}/> Indicator Heatmap</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{indicators.map(ind=>(<div key={ind.n} className="rounded-lg border border-border p-3"><div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground font-medium">{ind.n}</span><span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{backgroundColor:sbb(ind.s),color:sc(ind.s)}}>{ind.s}</span></div><p className="text-lg font-bold">{ind.v||"N/A"}</p><p className="text-xs text-muted-foreground">{ind.ds}</p></div>))}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle>Key Price Levels</CardTitle></CardHeader><CardContent><div className="space-y-1">{[{n:"SMA 50",v:d.SMA50,ab:d.price>d.SMA50},{n:"SMA 200",v:d.SMA200,ab:d.price>d.SMA200},{n:"EMA 20",v:d.EMA20,ab:d.price>d.EMA20},{n:"EMA 9",v:d.EMA9,ab:d.price>d.EMA9},{n:"VWAP",v:d.VWAP,ab:d.price>d.VWAP}].map((lv,i)=>lv.v&&(<div key={i} className="flex justify-between py-2.5 border-b border-border last:border-0"><span className="text-sm font-medium">{lv.n}</span><div className="text-right"><p className="text-sm font-semibold">INR {Number(lv.v).toFixed(2)}</p><p className="text-xs font-semibold" style={{color:lv.ab?"#34D399":"#F87171"}}>Price {lv.ab?"above":"below"}</p></div></div>))}</div></CardContent></Card>
      </div>)}

      {subTab==="events"&&(<div className="space-y-6">
        <Card><CardHeader className="pb-3"><CardTitle>Recent Technical Events</CardTitle></CardHeader><CardContent className="space-y-2">
          {d.candle&&<div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(d.candle.type)}}/><div><p className="text-sm font-medium">{d.candle.latest} Pattern</p><p className="text-xs text-muted-foreground">Today</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{backgroundColor:sbb(d.candle.type),color:sc(d.candle.type)}}>{d.candle.type}</span></div>}
          {crossovers.map((cr:any,i:number)=>(<div key={i} className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(cr.status==="Bullish"?"bullish":"bearish")}}/><div><p className="text-sm font-medium">{cr.name} — {cr.status}</p><p className="text-xs text-muted-foreground">{cr.daysAgo}d ago</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{backgroundColor:sbb(cr.status==="Bullish"?"bullish":"bearish"),color:sc(cr.status==="Bullish"?"bullish":"bearish")}}>{cr.status}</span></div>))}
          {d.MACD!=null&&<div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(d.MACD>d.MACDSignal?"bullish":"bearish")}}/><div><p className="text-sm font-medium">MACD {d.MACD>d.MACDSignal?"Bullish":"Bearish"}</p><p className="text-xs text-muted-foreground">Active</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{backgroundColor:sbb(d.MACD>d.MACDSignal?"bullish":"bearish"),color:sc(d.MACD>d.MACDSignal?"bullish":"bearish")}}>{d.MACD>d.MACDSignal?"Bullish":"Bearish"}</span></div>}
        </CardContent></Card>
        <div className="rounded-lg bg-[#FBBF24]/5 border border-[#FBBF24]/20 p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-[#FBBF24]"/><span className="text-xs font-semibold text-[#FBBF24]">DISCLAIMER</span></div><p className="text-xs text-muted-foreground">Technical analysis is based on historical data and does not constitute financial advice. Past performance does not guarantee future results.</p></div>
      </div>)}
    </div>
  )
}
