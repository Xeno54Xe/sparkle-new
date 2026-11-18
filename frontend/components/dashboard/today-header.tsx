"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"

function istLine(now: Date) {
  const day = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" })
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const mins = ist.getHours() * 60 + ist.getMinutes()
  const weekday = ist.getDay() >= 1 && ist.getDay() <= 5
  let session = "Markets are closed for the weekend."
  if (weekday) {
    if (mins < 9 * 60 + 15) session = "NSE opens at 09:15 IST."
    else if (mins < 15 * 60 + 30) session = "NSE is trading until 15:30 IST."
    else session = "NSE closed at 15:30 IST. Prices are from the last session."
  }
  return { day, session }
}

/** Dashboard opener: today's date in IST and where the session stands. */
export function TodayHeader() {
  const [line, setLine] = useState<{ day: string; session: string } | null>(null)
  useEffect(() => { setLine(istLine(new Date())) }, [])
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="h-5 text-sm text-muted-foreground">{line?.day}</p>
        <h1 className="display mt-2 text-[40px] text-foreground sm:text-[52px]">Market today</h1>
        <p className="mt-3 h-5 text-sm text-muted-foreground">{line?.session}</p>
      </div>
      <Link href="/ask" className="group flex h-10 shrink-0 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm text-foreground transition-colors hover:border-primary/50">
        <Sparkles size={15} className="text-primary" />
        Ask Sparkle about today
      </Link>
    </div>
  )
}
