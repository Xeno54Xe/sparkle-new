"use client"

import { useEffect, useRef } from "react"
import { Panel, PanelHeader } from "@/components/ui/panel"

// TradingView's free embed only serves NSE data on tradingview.com itself, so
// the widget uses the BSE listing, which shares our tickers.
export function tradingViewSymbol(symbol: string) {
  return `BSE:${symbol}`
}

export function TradingViewChart({ symbol, height, studies, title, description }: {
  symbol: string
  height: number
  studies?: string[]
  title: string
  description?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const studiesKey = (studies || []).join(",")

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ""

    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget"
    widget.style.height = "100%"
    widget.style.width = "100%"

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: String(height),
      symbol: tradingViewSymbol(symbol),
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: "rgba(20, 27, 43, 1)",
      gridColor: "rgba(38, 49, 73, 0.6)",
      studies: studiesKey ? studiesKey.split(",") : [],
    })

    // TradingView's script looks up its container when it runs. If the page is
    // left before it has loaded, park the container off-screen until it has
    // run, so it doesn't throw on a detached element.
    let loaded = false
    let parked: HTMLDivElement | null = null
    const settle = () => {
      loaded = true
      parked?.remove()
    }
    script.addEventListener("load", settle)
    script.addEventListener("error", settle)

    el.appendChild(widget)
    el.appendChild(script)
    return () => {
      if (!loaded) {
        parked = document.createElement("div")
        parked.setAttribute("aria-hidden", "true")
        parked.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden"
        parked.append(...Array.from(el.childNodes))
        document.body.appendChild(parked)
        setTimeout(() => parked?.remove(), 30000)
      }
      el.innerHTML = ""
    }
  }, [symbol, height, studiesKey])

  return (
    <Panel>
      <PanelHeader
        title={title}
        description={description}
        actions={<a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Chart by TradingView</a>}
      />
      <div ref={ref} className="tradingview-widget-container" style={{ height, width: "100%" }} />
    </Panel>
  )
}
