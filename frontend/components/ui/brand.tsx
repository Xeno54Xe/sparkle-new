import Link from "next/link"
import { cn } from "@/lib/utils"

/** A lime tile holding three candles: the product in one glyph. */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="var(--lime)" />
      <rect x="5.5" y="9" width="3" height="8" rx="0.8" fill="var(--obsidian)" />
      <rect x="6.6" y="6.5" width="0.8" height="12.5" fill="var(--obsidian)" />
      <rect x="10.5" y="6" width="3" height="7" rx="0.8" fill="var(--obsidian)" opacity=".55" />
      <rect x="11.6" y="4" width="0.8" height="11" fill="var(--obsidian)" opacity=".55" />
      <rect x="15.5" y="8" width="3" height="10" rx="0.8" fill="var(--obsidian)" />
      <rect x="16.6" y="5.5" width="0.8" height="14" fill="var(--obsidian)" />
    </svg>
  )
}

export function BrandWord({ className }: { className?: string }) {
  return <span className={cn("font-display text-[17px] font-semibold tracking-[-0.03em]", className)}>SparkleAI</span>
}

export function BrandLink({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex w-fit items-center gap-2.5 text-foreground", className)}>
      <BrandMark />
      <BrandWord />
    </Link>
  )
}
