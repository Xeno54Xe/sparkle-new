import type { ReactNode } from "react"
import { BrandLink } from "@/components/ui/brand"

const FACTS = [
  { figure: "50", text: "Nifty 50 companies with live prices and 15 technical indicators each" },
  { figure: "267", text: "earnings calls and annual reports read and scored by AI, downloadable as PDFs" },
  { figure: "5m", text: "between screener refreshes, so signals track the session as it moves" },
]

/** Two-column auth frame: product facts on the left (desktop only), the form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[46%] max-w-[640px] flex-col justify-between border-r border-line bg-surface p-12 lg:flex">
        <BrandLink />
        <div>
          <h2 className="figure max-w-md text-5xl leading-[1.05] text-foreground">Research the Nifty 50 like you have an analyst desk.</h2>
          <dl className="mt-10 space-y-5">
            {FACTS.map(f => (
              <div key={f.text} className="flex items-baseline gap-4">
                <dt className="figure w-14 shrink-0 text-right text-2xl text-primary">{f.figure}</dt>
                <dd className="max-w-sm text-sm leading-relaxed text-muted-foreground">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-faint-foreground">For research and education. Not investment advice.</p>
      </aside>

      <main className="flex flex-1 flex-col px-5 py-6 sm:px-8">
        <BrandLink className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  )
}

export const authInput =
  "h-11 w-full rounded-md border border-line bg-surface px-3.5 text-sm text-foreground placeholder:text-faint-foreground transition-colors focus:border-primary/60 focus:outline-none"
export const authButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
