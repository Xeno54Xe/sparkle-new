"use client"

import { useState, useEffect } from "react"
import { Activity, TrendingUp, TrendingDown, Target, BarChart2, Zap, AlertTriangle, Lightbulb, Loader2, Shield, Crosshair, ArrowUpRight, ArrowDownRight } from "lucide-react"
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

function calcFibTargets(price: number, support: any, resistance: any) {
  const s1 = support?.S1 || price * 0.98, r1 = resistance?.R1 || price * 1.02, range = r1 - s1
  return { fib236: +(s1+range*0.236).toFixed(2), fib382: +(s1+range*0.382).toFixed(2), fib500: +(s1+range*0.5).toFixed(2), fib618: +(s1+range*0.618).toFixed(2), target1: +(r1+range*0.618).toFixed(2), target2: +(r1+range*1.0).toFixed(2), target3: +(r1+range*1.618).toFixed(2) }
}

function genRec(d: any, v: any, sym: string) {
  const p = d.price, s1 = d.support?.S1||p*0.98, r1 = d.resistance?.R1||p*1.02, sl = d.support?.S2||p*0.96, tgt = d.resistance?.R2||p*1.04
  const rPct = ((p-sl)/p*100).toFixed(1), rwPct = ((tgt-p)/p*100).toFixed(1), rr = (parseFloat(rwPct)/parseFloat(rPct)).toFixed(1)
  if (v.sig==="BUY") return { action:"BUY", color:"#34D399", summary:`${sym} shows bullish momentum with ${v.buys} of 11 indicators favoring upside.`, detail:`Trading at INR ${p?.toFixed(2)} with ${d.price>d.SMA50?"bullish":"cautious"} positioning. RSI at ${d.RSI?.toFixed(1)} indicates ${d.RSI<50?"room for upside":"moderate momentum"}. MACD is ${d.MACD>d.MACDSignal?"bullish with signal line crossover":"showing convergence"}. The ${d.candle?.latest||"current"} pattern ${d.candle?.type==="bullish"?"confirms buying pressure":"suggests consolidation"}.`, entry:`INR ${(p*0.998).toFixed(2)} - ${(p*1.002).toFixed(2)}`, stopLoss:`INR ${sl.toFixed(2)} (${rPct}% risk)`, target1:`INR ${r1?.toFixed(2)} (R1)`, target2:`INR ${tgt.toFixed(2)} (R2)`, rr, tf:"1-2 weeks" }
  if (v.sig==="SELL") return { action:"SELL / AVOID", color:"#F87171", summary:`${sym} faces bearish pressure with ${v.sells} of 11 indicators signaling downside.`, detail:`At INR ${p?.toFixed(2)}, the stock is ${d.price<d.SMA200?"below the 200-day SMA confirming downtrend":"losing momentum"}. RSI at ${d.RSI?.toFixed(1)} ${d.RSI>70?"signals overbought":d.RSI<30?"is oversold but lacks reversal":"shows weakening"}. ${Object.values(d.crossovers||{}).filter((c:any)=>c.status==="Bearish").length} bearish crossovers active.`, entry:"Wait for reversal", stopLoss:`INR ${(p*1.03).toFixed(2)} (short)`, target1:`INR ${s1?.toFixed(2)} (S1)`, target2:`INR ${d.support?.S2?.toFixed(2)} (S2)`, rr, tf:"1-2 weeks" }
  return { action:"HOLD / WAIT", color:"#FBBF24", summary:`${sym} is neutral with mixed signals - ${v.buys} buy, ${v.sells} sell, ${v.n} neutral.`, detail:`At INR ${p?.toFixed(2)}, no clear direction. RSI at ${d.RSI?.toFixed(1)} in neutral zone. Wait for break above INR ${r1?.toFixed(2)} (bullish) or below INR ${s1?.toFixed(2)} (bearish).`, entry:`Above INR ${r1?.toFixed(2)} or below INR ${s1?.toFixed(2)}`, stopLoss:"Set on breakout", target1:`INR ${r1?.toFixed(2)} (up)`, target2:`INR ${s1?.toFixed(2)} (down)`, rr, tf:"Wait for breakout" }
}

const sc = (t: string) => t==="BUY"||t==="STRONG"||t==="bullish"?"#34D399":t==="SELL"||t==="bearish"?"#F87171":"#FBBF24"
const sbb = (t: string) => sc(t)+"15"
const bc = (s: number) => s<35?"#EF4444":s<55?"#FBBF24":"#34D399"

export function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const [subTab, setSubTab] = useState<"overview"|"sentiment"|"indicators"|"events">("overview")
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { (async () => { setLoading(true); try { const r = await fetch(`${API}/full/${symbol}.NS`); if(r.ok){const t=await r.text();try{const j=JSON.parse(t);if(j.indicators)setD(j.indicators)}catch{}} } catch(e){console.error(e)} setLoading(false) })() }, [symbol])

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 size={20} className="animate-spin"/> Loading...</div>
  if (!d) return <div className="text-center py-20 text-muted-foreground">No technical data for {symbol}</div>

  const v = calcVerdict(d), fib = calcFibTargets(d.price, d.support, d.resistance), rec = genRec(d, v, symbol)
  const crossovers = Object.values(d.crossovers||{}) as any[]
  const s1=d.support?.S1||d.price*0.98, s2=d.support?.S2||d.price*0.96, r1=d.resistance?.R1||d.price*1.02, r2=d.resistance?.R2||d.price*1.04
  const downside=((d.price-s2)/d.price*100), upside=((r2-d.price)/d.price*100), rrRatio=upside/(downside||1)
  const sma50Pct=d.SMA50!=null?((d.price-d.SMA50)/d.SMA50*100):null, sma200Pct=d.SMA200!=null?((d.price-d.SMA200)/d.SMA200*100):null
  const rsScore=Math.max(0,Math.min(100,Math.round(50+sma50Pct*3+sma200Pct*2)))

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
      <div className="flex gap-2">{(["overview","sentiment","indicators","events"] as const).map(t=>(<button key={t} onClick={()=>setSubTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${subTab===t?"bg-primary text-primary-foreground shadow-lg":"bg-secondary text-muted-foreground hover:text-foreground"}`}>{t}</button>))}</div>

      {subTab==="overview" && (<div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Verdict Gauge */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent"><CardContent className="pt-6"><div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-[3px] text-muted-foreground mb-4">TECHNICAL VERDICT</p>
            <div className="relative w-48 h-28 mb-2"><svg viewBox="0 0 200 110" className="w-full h-full">{[{a:-90,b:-54,c:"#EF4444"},{a:-50,b:-18,c:"#F97316"},{a:-14,b:14,c:"#FBBF24"},{a:18,b:50,c:"#84CC16"},{a:54,b:90,c:"#10B981"}].map(({a,b,c},i)=>{const tr=(deg:number)=>((deg-90)*Math.PI)/180;return<path key={i} d={`M ${100+72*Math.cos(tr(a))} ${100+72*Math.sin(tr(a))} A 72 72 0 0 1 ${100+72*Math.cos(tr(b))} ${100+72*Math.sin(tr(b))}`} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" opacity={0.8}/>})}{(()=>{const na=-90+(v.ov/100)*180,nr=((na-90)*Math.PI)/180;return<line x1={100} y1={100} x2={100+54*Math.cos(nr)} y2={100+54*Math.sin(nr)} stroke="white" strokeWidth="3" strokeLinecap="round"/>})()}<circle cx={100} cy={100} r={4} fill="white"/></svg></div>
            <p className="text-4xl font-bold">{v.ov}</p>
            <p className="text-sm font-semibold mt-1" style={{color:sc(v.sig)}}>{v.ov>=60?"Bullish":v.ov<=40?"Bearish":"Neutral"}</p>
            <div className="inline-flex mt-3 rounded-full px-5 py-2 text-sm font-bold" style={{backgroundColor:sbb(v.sig),color:sc(v.sig)}}>{v.sig}</div>
            <div className="flex gap-8 mt-4">{[{c:"#34D399",val:v.buys,l:"Buy"},{c:"#F87171",val:v.sells,l:"Sell"},{c:"#FBBF24",val:v.n,l:"Neutral"}].map(i=>(<div key={i.l} className="text-center"><p className="text-xl font-bold" style={{color:i.c}}>{i.val}</p><p className="text-xs text-muted-foreground">{i.l}</p></div>))}</div>
          </div></CardContent></Card>

          {/* AI Trade Recommendation */}
          <Card style={{borderLeftWidth:3,borderLeftColor:rec.color}}>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Crosshair size={20} style={{color:rec.color}}/> AI Trade Recommendation</CardTitle>
              <div className="inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-bold mt-1" style={{backgroundColor:rec.color+"15",color:rec.color}}>{rec.action}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold">{rec.summary}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{rec.detail}</p>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div><p className="text-xs text-muted-foreground">Entry Zone</p><p className="text-sm font-semibold">{rec.entry}</p></div>
                <div><p className="text-xs text-muted-foreground">Stop Loss</p><p className="text-sm font-semibold text-destructive">{rec.stopLoss}</p></div>
                <div><p className="text-xs text-muted-foreground">Target 1</p><p className="text-sm font-semibold text-primary">{rec.target1}</p></div>
                <div><p className="text-xs text-muted-foreground">Target 2</p><p className="text-sm font-semibold text-primary">{rec.target2}</p></div>
                <div><p className="text-xs text-muted-foreground">Risk:Reward</p><p className="text-sm font-semibold">1:{rec.rr}</p></div>
                <div><p className="text-xs text-muted-foreground">Timeframe</p><p className="text-sm font-semibold">{rec.tf}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk/Reward + Relative Strength */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Shield size={20}/> Risk / Reward Analysis</CardTitle></CardHeader><CardContent>
            <div className="flex justify-between mb-4"><span className="text-sm text-muted-foreground">Current Price</span><span className="text-lg font-bold">INR {d.price?.toFixed(2)}</span></div>
            <div className="relative h-12 rounded-lg overflow-hidden mb-4 flex">
              <div className="flex items-center justify-center text-xs font-bold text-white" style={{width:`${(downside/(downside+upside))*100}%`,backgroundColor:"#EF4444"}}><ArrowDownRight size={14} className="mr-1"/>{downside.toFixed(1)}%</div>
              <div className="flex items-center justify-center text-xs font-bold text-white" style={{width:`${(upside/(downside+upside))*100}%`,backgroundColor:"#34D399"}}><ArrowUpRight size={14} className="mr-1"/>{upside.toFixed(1)}%</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-center"><p className="text-xs text-muted-foreground">Downside (S2)</p><p className="text-sm font-bold text-destructive">INR {s2.toFixed(2)}</p><p className="text-xs text-destructive">-{downside.toFixed(1)}%</p></div>
              <div className="rounded-lg bg-secondary border border-border p-3 text-center"><p className="text-xs text-muted-foreground">R:R Ratio</p><p className="text-xl font-bold" style={{color:rrRatio>=2?"#34D399":rrRatio>=1?"#FBBF24":"#EF4444"}}>1:{rrRatio.toFixed(1)}</p><p className="text-xs text-muted-foreground">{rrRatio>=2?"Favorable":rrRatio>=1?"Acceptable":"Unfavorable"}</p></div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center"><p className="text-xs text-muted-foreground">Upside (R2)</p><p className="text-sm font-bold text-primary">INR {r2.toFixed(2)}</p><p className="text-xs text-primary">+{upside.toFixed(1)}%</p></div>
            </div>
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Activity size={20}/> Relative Strength vs Nifty 50</CardTitle></CardHeader><CardContent>
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-full h-6 rounded-full bg-gradient-to-r from-[#EF4444] via-[#FBBF24] to-[#34D399] mb-2"><div className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-lg" style={{left:`${rsScore}%`,transform:"translate(-50%,-50%)",borderColor:bc(rsScore)}}/></div>
              <div className="flex justify-between w-full text-xs font-semibold"><span className="text-destructive">Underperform</span><span className="text-[#FBBF24]">In-line</span><span className="text-primary">Outperform</span></div>
            </div>
            <div className="text-center mb-4"><p className="text-3xl font-bold" style={{color:bc(rsScore)}}>{rsScore}</p><p className="text-xs text-muted-foreground">Relative Strength Score</p></div>
            <div className="space-y-2">
              {([{l:"vs SMA 50",v:sma50Pct},{l:"vs SMA 200",v:sma200Pct},{l:"ADX Strength",v:d.ADX as number|null,isAbs:true},{l:"Momentum (ROC)",v:d.ROC as number|null}] as {l:string,v:number|null,isAbs?:boolean}[]).filter(r=>r.v!=null).map((r,i)=>{const rv=r.v as number;return(<div key={i} className="flex justify-between py-2 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{r.l}</span><span className="text-sm font-semibold" style={{color:r.isAbs?(rv>25?"#34D399":"#FBBF24"):(rv>=0?"#34D399":"#EF4444")}}>{r.isAbs?rv.toFixed(1)+" "+(rv>25?"(Strong)":"(Weak)"):(rv>=0?"+":"")+rv.toFixed(2)+"%"}</span></div>)})}
            </div>
          </CardContent></Card>
        </div>

        {/* Fibonacci Price Targets */}
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Target size={20} className="text-primary"/> Price Targets (Fibonacci)</CardTitle><p className="text-xs text-muted-foreground">From support/resistance using Fibonacci retracements & extensions</p></CardHeader><CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[{l:"Fib 23.6%",v:fib.fib236},{l:"Fib 38.2%",v:fib.fib382},{l:"Fib 50.0%",v:fib.fib500},{l:"Fib 61.8%",v:fib.fib618}].map((f,i)=>(<div key={i} className="rounded-lg border border-border p-3 text-center"><p className="text-xs text-muted-foreground">{f.l}</p><p className="text-lg font-bold">INR {f.v.toFixed(2)}</p><p className="text-xs" style={{color:d.price>f.v?"#34D399":"#F87171"}}>{d.price>f.v?"Above":"Below"}</p></div>))}
          </div>
          <p className="text-xs font-semibold text-primary mb-3">Extension Targets (Upside)</p>
          <div className="grid grid-cols-3 gap-3">
            {[{l:"Target 1 (61.8%)",v:fib.target1},{l:"Target 2 (100%)",v:fib.target2},{l:"Target 3 (161.8%)",v:fib.target3}].map((f,i)=>(<div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center"><p className="text-xs text-muted-foreground">{f.l}</p><p className="text-lg font-bold text-primary">INR {f.v.toFixed(2)}</p><p className="text-xs text-primary">+{((f.v-d.price)/d.price*100).toFixed(1)}%</p></div>))}
          </div>
        </CardContent></Card>

        {/* Verdict Breakdown + Candlestick + S/R + Crossovers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BarChart2 size={20}/> Verdict Breakdown</CardTitle></CardHeader><CardContent className="space-y-4">
              {[{n:"Trend (25%)",s:v.ts,f:"SMA50, SMA200, EMA20, EMA9, Ichimoku"},{n:"Momentum (25%)",s:v.ms,f:"MACD, Hist, ROC, ADX"},{n:"Oscillators (20%)",s:v.os,f:"RSI, Stoch, CCI, W%R, MFI"},{n:"Volume (15%)",s:v.vs,f:"VWAP, OBV"},{n:"Patterns (15%)",s:v.ps,f:"Candle, Crossovers"}].map((c,i)=>(<div key={i}><div className="flex justify-between mb-1"><span className="text-sm font-medium">{c.n}</span><span className="text-sm font-bold" style={{color:bc(c.s)}}>{c.s}</span></div><div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{width:`${c.s}%`,backgroundColor:bc(c.s)}}/></div><p className="text-xs text-muted-foreground mt-1">{c.f}</p></div>))}
            </CardContent></Card>
            <Card className="border-[#6366F1]/30 bg-gradient-to-r from-[#6366F1]/5 to-transparent"><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Lightbulb size={16} className="text-[#6366F1]"/><span className="text-sm font-semibold text-[#6366F1]">What does this mean?</span></div>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.buys} of 11 indicators suggest buying. The stock formed a <span className="font-semibold" style={{color:sc(d.candle?.type||"neutral")}}>{d.candle?.latest||"N/A"}</span> pattern. Price is {d.price>d.SMA50?"above":"below"} the 50-day and {d.price>d.SMA200?"above":"below"} the 200-day MA. Risk-reward is 1:{rrRatio.toFixed(1)} ({rrRatio>=2?"favorable":"caution advised"}).</p>
            </CardContent></Card>
          </div>
          <div className="space-y-6">
            {d.candle&&(<Card><CardHeader className="pb-3"><CardTitle>Candlestick Pattern</CardTitle></CardHeader><CardContent><div className="flex justify-between mb-3"><span className="text-lg font-bold">{d.candle.latest}</span><span className="rounded-full px-3 py-1 text-xs font-semibold capitalize" style={{backgroundColor:sbb(d.candle.type),color:sc(d.candle.type)}}>{d.candle.type}</span></div><p className="text-sm text-muted-foreground">{d.candle.description}</p><p className="text-xs text-muted-foreground mt-2">Reliability: <span className="font-semibold text-foreground">{d.candle.reliability}</span></p></CardContent></Card>)}
            {d.support&&d.resistance&&(<Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Target size={20}/> Support & Resistance</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4"><div><p className="text-xs font-semibold text-primary mb-2 tracking-wider">SUPPORT</p>{Object.entries(d.support).map(([k,val])=>(<div key={k} className="flex justify-between py-1.5 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm font-semibold text-primary">INR {Number(val).toFixed(2)}</span></div>))}</div><div><p className="text-xs font-semibold text-destructive mb-2 tracking-wider">RESISTANCE</p>{Object.entries(d.resistance).map(([k,val])=>(<div key={k} className="flex justify-between py-1.5 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm font-semibold text-destructive">INR {Number(val).toFixed(2)}</span></div>))}</div></div></CardContent></Card>)}
            {crossovers.length>0&&(<Card><CardHeader className="pb-3"><CardTitle>MA Crossovers</CardTitle></CardHeader><CardContent className="space-y-2">{crossovers.map((cr:any,i:number)=>(<div key={i} className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div><p className="text-sm font-medium">{cr.name}</p><p className="text-xs text-muted-foreground">{cr.daysAgo}d ago</p></div><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{backgroundColor:sbb(cr.status==="Bullish"?"bullish":"bearish"),color:sc(cr.status==="Bullish"?"bullish":"bearish")}}>{cr.status}</span></div>))}</CardContent></Card>)}
          </div>
        </div>
      </div>)}

      {subTab==="sentiment"&&(<div className="space-y-6">
        <Card><CardHeader className="pb-3"><CardTitle>Overall Sentiment</CardTitle></CardHeader><CardContent><div className="relative h-4 rounded-full bg-gradient-to-r from-[#EF4444] via-[#FBBF24] to-[#34D399]"><div className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-primary shadow-lg" style={{left:`${v.ov}%`,transform:"translate(-50%,-50%)"}}/></div><div className="flex justify-between mt-2 text-xs font-semibold"><span className="text-destructive">Bearish</span><span className="text-primary">Bullish ({v.ov})</span></div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle>Category Breakdown</CardTitle></CardHeader><CardContent className="space-y-4">{[{n:"Trend",v:v.ts,d:"SMA, EMA, Ichimoku"},{n:"Momentum",v:v.ms,d:"MACD, ROC, ADX"},{n:"Oscillators",v:v.os,d:"RSI, Stoch, CCI, W%R, MFI"},{n:"Volume",v:v.vs,d:"VWAP, OBV"},{n:"Patterns",v:v.ps,d:"Candle, Crossovers"}].map((s,i)=>(<div key={i}><div className="flex justify-between mb-1"><div><p className="text-sm font-medium">{s.n}</p><p className="text-xs text-muted-foreground">{s.d}</p></div><span className="text-sm font-bold" style={{color:bc(s.v)}}>{s.v}</span></div><div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.v}%`,backgroundColor:bc(s.v)}}/></div></div>))}</CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle>Signal Consensus</CardTitle></CardHeader><CardContent><div className="flex h-10 rounded-lg overflow-hidden mb-2"><div className="flex items-center justify-center text-xs font-bold text-white" style={{width:`${(v.sells/11)*100}%`,backgroundColor:"#EF4444"}}>{v.sells}</div><div className="flex items-center justify-center text-xs font-bold text-white" style={{width:`${(v.n/11)*100}%`,backgroundColor:"#FBBF24"}}>{v.n}</div><div className="flex items-center justify-center text-xs font-bold text-white" style={{width:`${(v.buys/11)*100}%`,backgroundColor:"#34D399"}}>{v.buys}</div></div><div className="flex justify-between text-xs font-semibold"><span className="text-destructive">Sell {v.sells}</span><span className="text-[#FBBF24]">Neutral {v.n}</span><span className="text-primary">Buy {v.buys}</span></div></CardContent></Card>
      </div>)}

      {subTab==="indicators"&&(<div className="space-y-6">
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Zap size={20}/> Indicator Heatmap</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{indicators.map(ind=>(<div key={ind.n} className="rounded-lg border border-border p-3"><div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground font-medium">{ind.n}</span><span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{backgroundColor:sbb(ind.s),color:sc(ind.s)}}>{ind.s}</span></div><p className="text-lg font-bold">{ind.v||"N/A"}</p><p className="text-xs text-muted-foreground">{ind.ds}</p></div>))}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle>Key Price Levels</CardTitle></CardHeader><CardContent><div className="space-y-1">{[{n:"SMA 50",v:d.SMA50,ab:d.price>d.SMA50},{n:"SMA 200",v:d.SMA200,ab:d.price>d.SMA200},{n:"EMA 20",v:d.EMA20,ab:d.price>d.EMA20},{n:"EMA 9",v:d.EMA9,ab:d.price>d.EMA9},{n:"VWAP",v:d.VWAP,ab:d.price>d.VWAP}].map((lv,i)=>lv.v&&(<div key={i} className="flex justify-between py-2.5 border-b border-border last:border-0"><span className="text-sm font-medium">{lv.n}</span><div className="text-right"><p className="text-sm font-semibold">INR {Number(lv.v).toFixed(2)}</p><p className="text-xs font-semibold" style={{color:lv.ab?"#34D399":"#F87171"}}>Price {lv.ab?"above":"below"}</p></div></div>))}</div></CardContent></Card>
      </div>)}

      {subTab==="events"&&(<div className="space-y-6">
        <Card><CardHeader className="pb-3"><CardTitle>Recent Technical Events</CardTitle></CardHeader><CardContent className="space-y-2">
          {d.candle&&<div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(d.candle.type)}}/><div><p className="text-sm font-medium">{d.candle.latest} Pattern</p><p className="text-xs text-muted-foreground">Today</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{backgroundColor:sbb(d.candle.type),color:sc(d.candle.type)}}>{d.candle.type}</span></div>}
          {crossovers.map((cr:any,i:number)=>(<div key={i} className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(cr.status==="Bullish"?"bullish":"bearish")}}/><div><p className="text-sm font-medium">{cr.name} — {cr.status}</p><p className="text-xs text-muted-foreground">{cr.daysAgo}d ago</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{backgroundColor:sbb(cr.status==="Bullish"?"bullish":"bearish"),color:sc(cr.status==="Bullish"?"bullish":"bearish")}}>{cr.status}</span></div>))}
          {d.MACD!==undefined&&<div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:sc(d.MACD>d.MACDSignal?"bullish":"bearish")}}/><div><p className="text-sm font-medium">MACD {d.MACD>d.MACDSignal?"Bullish":"Bearish"}</p><p className="text-xs text-muted-foreground">Active</p></div></div><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{backgroundColor:sbb(d.MACD>d.MACDSignal?"bullish":"bearish"),color:sc(d.MACD>d.MACDSignal?"bullish":"bearish")}}>{d.MACD>d.MACDSignal?"Bullish":"Bearish"}</span></div>}
        </CardContent></Card>
        <div className="rounded-lg bg-[#FBBF24]/5 border border-[#FBBF24]/20 p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-[#FBBF24]"/><span className="text-xs font-semibold text-[#FBBF24]">DISCLAIMER</span></div><p className="text-xs text-muted-foreground">Technical analysis is based on historical data and does not constitute financial advice. Past performance does not guarantee future results.</p></div>
      </div>)}
    </div>
  )
}
