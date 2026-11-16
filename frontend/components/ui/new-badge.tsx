import { cn } from "@/lib/utils"
import { describeFresh, type FreshReport } from "@/lib/fresh-reports"

/** Small "New" pill for a stock that has a fresh report. Renders nothing otherwise. */
export function NewBadge({ reports, className }: { reports?: FreshReport[]; className?: string }) {
  if (!reports?.length) return null
  const text = `New: ${reports.map(describeFresh).join("; ")}`
  return (
    <>
      <span
        aria-hidden
        title={text}
        className={cn(
          "inline-flex shrink-0 items-center rounded border border-info/30 bg-info/10 px-1.5 py-px text-[10px] font-semibold uppercase leading-4 tracking-wide text-info",
          className
        )}
      >
        New
      </span>
      <span className="sr-only">({text})</span>
    </>
  )
}
