"use client"

import type { LegDraft } from "../domain/types"
import { cn } from "@/lib/utils"

type OptionLegsTableProps = {
  legs: LegDraft[]
  onChange: (id: string, field: keyof LegDraft, value: string) => void
}

const numberInputClass =
  "h-10 w-full min-w-[96px] rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"

export function OptionLegsTable({ legs, onChange }: OptionLegsTableProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Option Legs</h2>
        <p className="text-sm text-muted-foreground">
          Model-estimated strikes and premiums are editable. These are not live broker quotes.
        </p>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left">Leg</th>
              <th className="px-3 py-3 text-left">Side</th>
              <th className="px-3 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-left">Strike</th>
              <th className="px-3 py-3 text-left">Premium</th>
              <th className="px-3 py-3 text-left">Qty</th>
              <th className="px-3 py-3 text-left">Lot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {legs.map((leg) => (
              <tr key={leg.id}>
                <td className="px-3 py-3 font-medium text-foreground">{leg.label}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", leg.side === "long" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-400")}>
                    {leg.side}
                  </span>
                </td>
                <td className="px-3 py-3 capitalize text-muted-foreground">{leg.optionType}</td>
                <td className="px-3 py-3">
                  <input aria-label={`${leg.label} strike`} inputMode="decimal" value={leg.strike} onChange={(event) => onChange(leg.id, "strike", event.target.value)} className={numberInputClass} />
                </td>
                <td className="px-3 py-3">
                  <input aria-label={`${leg.label} premium`} inputMode="decimal" value={leg.premium} onChange={(event) => onChange(leg.id, "premium", event.target.value)} className={numberInputClass} />
                </td>
                <td className="px-3 py-3">
                  <input aria-label={`${leg.label} quantity`} inputMode="numeric" value={leg.quantity} onChange={(event) => onChange(leg.id, "quantity", event.target.value)} className={numberInputClass} />
                </td>
                <td className="px-3 py-3">
                  <input aria-label={`${leg.label} lot size`} inputMode="numeric" value={leg.lotSize} onChange={(event) => onChange(leg.id, "lotSize", event.target.value)} className={numberInputClass} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {legs.map((leg) => (
          <div key={leg.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{leg.label}</p>
                <p className="text-xs capitalize text-muted-foreground">{leg.side} {leg.optionType}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["strike", "premium", "quantity", "lotSize"] as const).map((field) => (
                <label key={field} className="space-y-1 text-xs font-medium capitalize text-muted-foreground">
                  {field === "lotSize" ? "Lot size" : field}
                  <input
                    aria-label={`${leg.label} ${field}`}
                    inputMode={field === "quantity" || field === "lotSize" ? "numeric" : "decimal"}
                    value={leg[field]}
                    onChange={(event) => onChange(leg.id, field, event.target.value)}
                    className={numberInputClass}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
