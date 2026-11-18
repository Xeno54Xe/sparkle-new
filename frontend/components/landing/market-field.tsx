"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { nifty50Stocks } from "@/lib/stocks"
import { cn } from "@/lib/utils"

interface Tile { symbol: string; name: string; sector: string; price: number | null; change_pct: number | null }

const COLS = 10
const CELL = 46
const GAP = 12
const STEP = CELL + GAP

/** Column height in px for a day's move: flat days still read as a floor. */
function heightFor(pct: number | null) {
  if (pct == null) return 6
  return Math.min(132, 8 + Math.abs(pct) * 30)
}

function formatPct(pct: number | null) {
  if (pct == null) return "–"
  return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`
}

/**
 * The landing page's signature: all fifty Nifty constituents standing on one
 * floor, one column each, height set by today's move and grouped by sector.
 * Plain CSS 3D (no WebGL), painted once; the only ongoing work is a pointer
 * tilt, and it is skipped for reduced motion.
 */
export function MarketField() {
  const [tiles, setTiles] = useState<Tile[]>(() =>
    [...nifty50Stocks]
      .sort((a, b) => a.sector.localeCompare(b.sector))
      .map(s => ({ symbol: s.symbol, name: s.name, sector: s.sector, price: null, change_pct: null }))
  )
  const [live, setLive] = useState<"loading" | "live" | "offline">("loading")
  const [risen, setRisen] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/market/heatmap`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled) return
        const stocks: Tile[] = j?.stocks ?? []
        if (!stocks.length) { setLive("offline"); return }
        const bySymbol = new Map(stocks.map(s => [s.symbol, s]))
        setTiles(prev => prev.map(t => {
          const s = bySymbol.get(t.symbol)
          return s ? { ...t, price: s.price, change_pct: s.change_pct } : t
        }))
        setLive("live")
      })
      .catch(() => !cancelled && setLive("offline"))
      .finally(() => !cancelled && requestAnimationFrame(() => setRisen(true)))
    return () => { cancelled = true }
  }, [])

  // Pointer tilt: one rAF-throttled write of two custom properties.
  useEffect(() => {
    const wrap = wrapRef.current
    const scene = sceneRef.current
    if (!wrap || !scene) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const r = wrap.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        scene.style.setProperty("--tilt-z", `${45 + x * 10}deg`)
        scene.style.setProperty("--tilt-x", `${58 - y * 6}deg`)
      })
    }
    const onLeave = () => {
      scene.style.setProperty("--tilt-z", "45deg")
      scene.style.setProperty("--tilt-x", "58deg")
    }
    wrap.addEventListener("pointermove", onMove)
    wrap.addEventListener("pointerleave", onLeave)
    return () => {
      wrap.removeEventListener("pointermove", onMove)
      wrap.removeEventListener("pointerleave", onLeave)
      cancelAnimationFrame(frame)
    }
  }, [])

  const leader = useMemo(() => {
    const withData = tiles.filter(t => t.change_pct != null)
    if (!withData.length) return null
    return withData.reduce((a, b) => (Math.abs(b.change_pct!) > Math.abs(a.change_pct!) ? b : a))
  }, [tiles])

  const shown = tiles.find(t => t.symbol === focus) ?? leader
  const up = tiles.filter(t => (t.change_pct ?? 0) > 0).length
  const down = tiles.filter(t => (t.change_pct ?? 0) < 0).length

  const onEnter = useCallback((s: string) => setFocus(s), [])

  const width = COLS * STEP - GAP
  const depth = Math.ceil(tiles.length / COLS) * STEP - GAP

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none">
      <div className="field-stage absolute inset-0 flex items-center justify-center">
        <div
          ref={sceneRef}
          className="field-scene relative"
          style={{ width, height: depth }}
          onPointerLeave={() => setFocus(null)}
        >
          <div className="field-floor absolute -inset-10" aria-hidden="true" />
          {tiles.map((t, i) => {
            const col = i % COLS
            const row = Math.floor(i / COLS)
            const h = risen ? heightFor(t.change_pct) : 2
            const dir = t.change_pct == null ? "flat" : t.change_pct > 0 ? "up" : t.change_pct < 0 ? "down" : "flat"
            const isLeader = leader?.symbol === t.symbol
            const isFocus = shown?.symbol === t.symbol
            return (
              <Link
                key={t.symbol}
                href={`/stock/${encodeURIComponent(t.symbol)}`}
                aria-label={`${t.name}: ${formatPct(t.change_pct)} today`}
                onPointerEnter={() => onEnter(t.symbol)}
                onFocus={() => onEnter(t.symbol)}
                className={cn("field-col absolute outline-none", `is-${dir}`, isLeader && "is-leader", isFocus && "is-focus")}
                style={{
                  left: col * STEP,
                  top: row * STEP,
                  width: CELL,
                  height: CELL,
                  ["--h" as string]: `${h}px`,
                  transitionDelay: risen ? `${(col + row) * 28}ms` : "0ms",
                }}
              >
                <span className="field-face field-top" />
                <span className="field-face field-front" />
                <span className="field-face field-side" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Readout: the column in focus, Bloomberg-terminal plain */}
      <div className="pointer-events-none absolute bottom-6 right-5 w-[248px] sm:bottom-10 sm:right-0 rounded-lg border border-line-strong bg-obsidian/85 p-4 backdrop-blur-sm" aria-live="polite">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{focus ? "In focus" : "Biggest move today"}</span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", live === "live" ? "bg-primary" : "bg-faint-foreground")} />
            {live === "live" ? "Live" : live === "loading" ? "Loading" : "Offline"}
          </span>
        </div>
        {shown ? (
          <>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="font-display text-xl font-semibold tracking-tight text-foreground">{shown.symbol}</span>
              <span className={cn("figure text-xl", (shown.change_pct ?? 0) >= 0 ? "text-up" : "text-down")}>{formatPct(shown.change_pct)}</span>
            </div>
            <div className="mt-0.5 flex justify-between gap-3 text-xs text-muted-foreground">
              <span className="truncate">{shown.name}</span>
              {shown.price != null && <span className="shrink-0 tabular">₹{shown.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>}
            </div>
            <p className="mt-0.5 text-xs text-faint-foreground">{shown.sector}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{live === "loading" ? "Fetching the fifty columns." : "Prices are unavailable right now."}</p>
        )}
        {live === "live" && (
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-xs tabular">
            <span className="text-up">{up} up</span>
            <span className="text-down">{down} down</span>
            <span className="ml-auto text-faint-foreground">Grouped by sector</span>
          </div>
        )}
      </div>
    </div>
  )
}
