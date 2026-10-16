import Link from "next/link"
import { cn } from "@/lib/utils"

/** Three candles: the product in one glyph. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="3" y="7" width="4" height="9" rx="1" fill="var(--primary)" />
      <rect x="4.5" y="4" width="1" height="15" fill="var(--primary)" />
      <rect x="10" y="4" width="4" height="7" rx="1" fill="var(--foreground)" opacity=".9" />
      <rect x="11.5" y="2" width="1" height="12" fill="var(--foreground)" opacity=".9" />
      <rect x="16" y="9" width="4" height="9" rx="1" fill="var(--primary)" />
      <rect x="17.5" y="6" width="1" height="14" fill="var(--primary)" />
    </svg>
  )
}

export function BrandLink({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex w-fit items-center gap-2.5 text-foreground", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight">SparkleAI</span>
    </Link>
  )
}
