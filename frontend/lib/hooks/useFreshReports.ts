"use client"

import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import type { FreshReports } from "@/lib/fresh-reports"

export { describeFresh, type FreshReport, type FreshReports } from "@/lib/fresh-reports"

// One request shared by every badge on the page, reused for a few minutes.
const TTL_MS = 5 * 60 * 1000
let cached: { at: number; data: FreshReports } | null = null
let inflight: Promise<FreshReports> | null = null

function loadFreshReports(): Promise<FreshReports> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.data)
  if (!inflight) {
    inflight = fetch(`${API_BASE}/reports/fresh`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const data: FreshReports = j && typeof j.symbols === "object" && j.symbols ? j.symbols : {}
        if (j?.symbols) cached = { at: Date.now(), data }
        return data
      })
      .catch(() => ({}))
      .finally(() => { inflight = null })
  }
  return inflight
}

/** symbol → its new reports. Empty until loaded, and when the backend is unreachable. */
export function useFreshReports(): FreshReports {
  const [data, setData] = useState<FreshReports>({})
  useEffect(() => {
    let live = true
    loadFreshReports().then(d => { if (live) setData(d) })
    return () => { live = false }
  }, [])
  return data
}
