// Shapes and labels for GET /reports/fresh (the "New" badges).

export interface FreshReport {
  kind: "sparkle" | "ec" | "ar"
  label: string
  /** "2026-10-17" for a Sparkle Report, "FEB26" for an earnings call, "FY25" for an annual report */
  period: string
}

export type FreshReports = Record<string, FreshReport[]>

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function describeFresh(r: FreshReport): string {
  if (r.kind === "sparkle") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.period)
    return m ? `${r.label}, ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : r.label
  }
  const m = /^([A-Z]{3})(\d{2})$/i.exec(r.period)
  if (m) {
    const month = MONTHS.find(x => x.toUpperCase() === m[1].toUpperCase())
    if (month) return `${r.label}, ${month} 20${m[2]}`
  }
  return `${r.label}, ${r.period}`
}
