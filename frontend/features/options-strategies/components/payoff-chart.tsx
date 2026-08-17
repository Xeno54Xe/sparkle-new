"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { OptionLeg, PayoffPoint, StrategyMetrics } from "../domain/types"

type PayoffChartProps = {
  points: PayoffPoint[]
  spotPrice: number
  legs: OptionLeg[]
  metrics: StrategyMetrics | null
}

function formatRs(value: number) {
  return `Rs ${Number(value).toFixed(0)}`
}

export function PayoffChart({ points, spotPrice, legs, metrics }: PayoffChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Enter valid strikes, premiums, expiry and lot size to draw the payoff graph.
      </div>
    )
  }

  const chartData = points.map((point) => ({
    price: point.expiryPrice,
    payoff: point.payoff,
    profit: point.payoff > 0 ? point.payoff : 0,
    loss: point.payoff < 0 ? point.payoff : 0,
  }))
  const breakevenText = metrics?.breakevens.length
    ? metrics.breakevens.map((value) => `Rs ${value.toFixed(2)}`).join(", ")
    : "none in displayed range"
  const maxProfitText = metrics?.maxProfit === null
    ? "theoretically unlimited"
    : `Rs ${metrics?.maxProfit?.toFixed(2) ?? "0.00"}`
  const maxLossText = `Rs ${metrics?.maxLoss?.toFixed(2) ?? "0.00"}`

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Expiry payoff graph">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Expiry Payoff Map</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Profit and loss update instantly from the manual strategy legs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">Profit zone</span>
          <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-destructive">Loss zone</span>
          <span className="rounded-md bg-sky-400/10 px-2.5 py-1 text-sky-300">Spot</span>
        </div>
      </div>
      <div className="p-4">
        <ChartContainer
          config={{
            payoff: { label: "P/L", color: "#34d399" },
            profit: { label: "Profit", color: "#10b981" },
            loss: { label: "Loss", color: "#ef4444" },
          }}
          className="min-h-[360px] w-full"
        >
          <ComposedChart data={chartData} margin={{ left: 4, right: 12, top: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="price" tickFormatter={(value) => formatRs(Number(value))} />
            <YAxis tickFormatter={(value) => formatRs(Number(value))} width={78} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="profit" fill="#10b981" fillOpacity={0.18} stroke="transparent" isAnimationActive={false} />
            <Area dataKey="loss" fill="#ef4444" fillOpacity={0.18} stroke="transparent" isAnimationActive={false} />
            <Line type="monotone" dataKey="payoff" stroke="#34d399" strokeWidth={3} dot={false} isAnimationActive={false} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" label="Zero" />
            <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeDasharray="4 4" label="Spot" />
            {legs.map((leg) => (
              <ReferenceLine key={leg.id} x={leg.strike} stroke="#f59e0b" strokeDasharray="3 3" label={`K ${leg.strike}`} />
            ))}
            {metrics?.breakevens.map((breakeven) => (
              <ReferenceLine key={breakeven} x={breakeven} stroke="#a78bfa" strokeDasharray="2 4" label="BE" />
            ))}
            {metrics?.maxProfit !== null && metrics?.maxProfit !== undefined && (
              <ReferenceLine y={metrics.maxProfit} stroke="#10b981" strokeDasharray="2 2" label="Max profit" />
            )}
            {metrics?.maxLoss !== null && metrics?.maxLoss !== undefined && (
              <ReferenceLine y={metrics.maxLoss} stroke="#ef4444" strokeDasharray="2 2" label="Max loss" />
            )}
          </ComposedChart>
        </ChartContainer>
        <div className="grid gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:grid-cols-3">
          <p><span className="font-semibold text-foreground">Breakeven:</span> {breakevenText}</p>
          <p><span className="font-semibold text-foreground">Max profit:</span> {maxProfitText}</p>
          <p><span className="font-semibold text-foreground">Max loss:</span> {maxLossText}</p>
        </div>
      </div>
    </section>
  )
}
