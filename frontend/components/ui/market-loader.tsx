"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Candle geometry: [x, body top, body height, wick top, wick height]. Heights vary
// so the resting state already reads as a small chart.
const CANDLES = [
  [2, 14, 14, 9, 24],
  [12, 8, 16, 4, 26],
  [22, 16, 10, 12, 18],
  [32, 6, 18, 2, 28],
  [42, 11, 13, 7, 22],
] as const

function Candles({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 50 31" aria-hidden="true" className="overflow-visible">
      {CANDLES.map(([x, by, bh, wy, wh], i) => {
        const color = i % 2 === 0 ? "var(--primary)" : "var(--foreground)"
        return (
          <g key={i} className="candle-anim" style={{ animationDelay: `${i * 0.14}s`, transformBox: "fill-box" }}>
            <rect x={x + 2.5} y={wy} width={1} height={wh} fill={color} opacity={0.7} />
            <rect x={x} y={by} width={6} height={bh} rx={1.2} fill={color} />
          </g>
        )
      })}
    </svg>
  )
}

// What we tell the user as the wait grows. The later lines explain the free-tier
// cold start honestly instead of leaving them guessing.
function stagesFor(label: string) {
  return [
    { after: 0, text: `Loading ${label}` },
    { after: 3, text: "Fetching live prices from Yahoo Finance" },
    { after: 8, text: "Waking the data server. On the free plan it sleeps when idle, so the first load can take up to a minute." },
    { after: 25, text: "Still working. This only happens on the first visit after a quiet spell." },
    { after: 60, text: "This is taking longer than usual. The data service may be down; try refreshing in a minute." },
  ]
}

function useElapsedSeconds() {
  const [s, setS] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setS(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return s
}

/**
 * Branded loading state for slow data. `variant="page"` fills the content area
 * (route transitions); `variant="panel"` sits inside a Panel; `variant="compact"`
 * is a single row for strips and small panels.
 */
export function MarketLoader({ label = "market data", variant = "panel", className }: {
  label?: string
  variant?: "page" | "panel" | "compact"
  className?: string
}) {
  const elapsed = useElapsedSeconds()
  const stages = stagesFor(label)
  const stageIndex = stages.reduce((idx, st, i) => (elapsed >= st.after ? i : idx), 0)
  const stage = stages[stageIndex]

  if (variant === "compact") {
    return (
      <div role="status" aria-live="polite" className={cn("flex items-center gap-4 px-5 py-6", className)}>
        <Candles size={44} />
        <div className="min-w-0">
          <p key={stageIndex} className="loader-text-in text-sm leading-snug text-muted-foreground">{stage.text}</p>
          <div className="relative mt-2 h-0.5 w-28 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="loader-sweep absolute inset-y-0 w-2/5 rounded-full bg-primary/70" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "page" ? "min-h-[60vh] py-16" : "py-14",
        className
      )}
    >
      <Candles size={variant === "page" ? 96 : 72} />
      <div className="relative mt-6 h-0.5 w-40 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="loader-sweep absolute inset-y-0 w-2/5 rounded-full bg-primary/70" />
      </div>
      <p key={stageIndex} className="loader-text-in mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {stage.text}
      </p>
      {elapsed >= 3 && <p className="mt-1.5 text-xs tabular text-faint-foreground">{elapsed}s</p>}
    </div>
  )
}
