"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Plus, Search, Trash2, X } from "lucide-react"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, EmptyState } from "@/components/ui/panel"
import { StockLogo } from "@/components/ui/stock-logo"
import { NewBadge } from "@/components/ui/new-badge"
import { useFreshReports } from "@/lib/hooks/useFreshReports"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { nifty50Stocks } from "@/lib/stocks"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Quote { price: number; change: number; change_pct: number }

function AddStockDialog({ open, onClose, onAdd, existing }: {
  open: boolean
  onClose: () => void
  onAdd: (symbol: string, name: string) => Promise<void>
  existing: Set<string>
}) {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey) }
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return nifty50Stocks.filter(s =>
      !existing.has(s.symbol) &&
      (s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))
    )
  }, [query, existing])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-stock-title">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-xl border border-line bg-surface sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id="add-stock-title" className="text-base font-medium text-foreground">Add to watchlist</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint-foreground" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Symbol, company or sector"
              aria-label="Find a stock"
              className="h-10 w-full rounded-md border border-line bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-faint-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>
        <ul className="flex-1 divide-y divide-line overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              {query ? `No unwatched stock matches “${query}”.` : "You're already watching every Nifty 50 stock."}
            </li>
          ) : filtered.map(stock => (
            <li key={stock.symbol} className="flex items-center gap-3 px-5 py-2.5">
              <StockLogo symbol={stock.symbol} size={28} className="rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{stock.symbol}</span>
                <span className="block truncate text-xs text-muted-foreground">{stock.name}</span>
              </span>
              <button
                disabled={adding === stock.symbol}
                onClick={async () => { setAdding(stock.symbol); await onAdd(stock.symbol, stock.name); setAdding(null) }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                <Plus size={14} /> {adding === stock.symbol ? "Adding" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function WatchlistPage() {
  const { items, loading, addStock, removeStock } = useWatchlist()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quotes, setQuotes] = useState<Record<string, Quote | null>>({})
  const fresh = useFreshReports()
  const [notice, setNotice] = useState<string | null>(null)
  const existing = useMemo(() => new Set(items.map(i => i.symbol)), [items])
  const symbolsKey = items.map(i => i.symbol).join(",")

  useEffect(() => { document.title = "Watchlist — SparkleAI" }, [])

  // Live quotes for every watched stock
  useEffect(() => {
    if (!symbolsKey) return
    let cancelled = false
    symbolsKey.split(",").forEach(sym => {
      fetch(`${API_BASE}/price/${encodeURIComponent(sym)}.NS`)
        .then(r => (r.ok ? r.json() : null))
        .then(j => { if (!cancelled) setQuotes(q => ({ ...q, [sym]: j && typeof j.price === "number" ? j : null })) })
        .catch(() => { if (!cancelled) setQuotes(q => ({ ...q, [sym]: null })) })
    })
    return () => { cancelled = true }
  }, [symbolsKey])

  const handleAdd = async (symbol: string, name: string) => {
    const ok = await addStock(symbol, name)
    setNotice(ok ? `Added ${symbol}` : `Couldn't add ${symbol}. It may already be on your list.`)
  }

  const handleRemove = async (id: string, symbol: string) => {
    await removeStock(id)
    setNotice(`Removed ${symbol}`)
  }

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(t)
  }, [notice])

  return (
    <DashboardShell>
      <PageHeader
        title="Watchlist"
        description={items.length ? `${items.length} stock${items.length === 1 ? "" : "s"} with live prices.` : "The stocks you want to keep an eye on."}
        actions={
          <button onClick={() => setDialogOpen(true)} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus size={15} /> Add stock
          </button>
        }
      />

      {loading ? (
        <Panel aria-busy="true"><div className="space-y-2 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="h-11 animate-pulse rounded bg-surface-2" />)}</div></Panel>
      ) : items.length === 0 ? (
        <Panel>
          <EmptyState
            title="Your watchlist is empty"
            action={<button onClick={() => setDialogOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus size={15} /> Add your first stock</button>}
          >
            Add Nifty 50 stocks to see their live prices together, here and on your dashboard.
          </EmptyState>
        </Panel>
      ) : (
        <Panel>
          <table className="w-full text-sm">
            <thead className="border-b border-line text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Stock</th>
                <th scope="col" className="hidden px-5 py-2.5 text-left font-medium md:table-cell">Sector</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Price</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Change</th>
                <th scope="col" className="w-12 px-3 py-2.5"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map(item => {
                const meta = nifty50Stocks.find(s => s.symbol === item.symbol)
                const q = quotes[item.symbol]
                const up = (q?.change_pct ?? 0) >= 0
                return (
                  <tr key={item.id} className="group hover:bg-surface-2/50">
                    <td className="px-5 py-3">
                      <Link href={`/stock/${encodeURIComponent(item.symbol)}`} className="flex items-center gap-3">
                        <StockLogo symbol={item.symbol} size={30} className="rounded-md" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium text-foreground group-hover:text-primary">{item.symbol}<NewBadge reports={fresh[item.symbol]} /></span>
                          <span className="block max-w-[160px] truncate text-xs text-muted-foreground sm:max-w-none">{item.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{meta?.sector}</td>
                    <td className="px-5 py-3 text-right tabular text-foreground">
                      {q === undefined ? <span className="ml-auto block h-3.5 w-16 animate-pulse rounded bg-surface-2" /> : q ? `₹${q.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className={cn("px-5 py-3 text-right tabular", q ? (up ? "text-up" : "text-down") : "text-faint-foreground")}>
                      {q ? `${up ? "+" : ""}${q.change_pct.toFixed(2)}%` : q === null ? "—" : ""}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleRemove(item.id, item.symbol)}
                        className="rounded-md p-1.5 text-faint-foreground transition-colors hover:bg-down/10 hover:text-down"
                        aria-label={`Remove ${item.symbol} from watchlist`}
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {notice && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-md border border-line bg-surface-2 px-4 py-2.5 text-sm text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {notice}
        </div>
      )}

      <AddStockDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAdd} existing={existing} />
    </DashboardShell>
  )
}
