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
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden border-r border-line bg-forest/50 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_0%_100%,rgba(197,255,74,0.10),transparent_70%)]" aria-hidden="true" />
        <BrandLink className="relative" />
        <div className="relative">
          <h2 className="display max-w-lg text-[64px] text-foreground">Research the Nifty 50 like you have an analyst desk.</h2>
          <dl className="mt-12 space-y-0 border-t border-line">
            {FACTS.map(f => (
              <div key={f.text} className="flex items-baseline gap-5 border-b border-line py-4">
                <dt className="figure w-14 shrink-0 text-3xl text-primary">{f.figure}</dt>
                <dd className="max-w-sm text-sm leading-relaxed text-muted-foreground">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="relative text-xs text-faint-foreground">For research and education. Not investment advice.</p>
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
  "h-11 w-full rounded-md border border-line bg-surface px-3.5 text-sm text-foreground placeholder:text-faint-foreground transition-[border-color,box-shadow] hover:border-line-strong focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(197,255,74,0.08)] focus:outline-none"
export const authButton =
  "btn-lime h-11 w-full px-6 text-sm disabled:opacity-60"
