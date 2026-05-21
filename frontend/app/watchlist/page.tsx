"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Star, Plus, TrendingUp, TrendingDown, Trash2, Search, X, Loader2 } from "lucide-react"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { nifty50Stocks } from "@/lib/stocks"
import { cn } from "@/lib/utils"

// ── Add Stock Modal ───────────────────────────────────────────────────────────
function AddStockModal({
  open,
  onClose,
  onAdd,
  existingSymbols,
}: {
  open: boolean
  onClose: () => void
  onAdd: (symbol: string, name: string) => Promise<void>
  existingSymbols: Set<string>
}) {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)

  const filtered = useMemo(() =>
    nifty50Stocks.filter(s =>
      !existingSymbols.has(s.symbol) &&
      (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.sector.toLowerCase().includes(query.toLowerCase()))
    ), [query, existingSymbols])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Plus size={16} className="text-primary" />
            </div>
            <h2 className="text-base font-bold">Add to Watchlist</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/5 px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, symbol or sector…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        {/* Stock list */}
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {existingSymbols.size === nifty50Stocks.length
                ? "All Nifty 50 stocks are already in your watchlist."
                : "No stocks match your search."}
            </div>
          ) : (
            filtered.map(stock => (
              <button
                key={stock.symbol}
                disabled={adding === stock.symbol}
                onClick={async () => {
                  setAdding(stock.symbol)
                  await onAdd(stock.symbol, stock.name)
                  setAdding(null)
                }}
                className="flex w-full items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors border-b border-white/[0.03] last:border-0 text-left group"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                  {stock.symbol.slice(0, 2)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                </div>
                {/* Sector */}
                <span className="shrink-0 text-xs text-muted-foreground bg-white/5 border border-white/10 rounded-full px-2.5 py-1 hidden sm:block">
                  {stock.sector}
                </span>
                {/* Add indicator */}
                {adding === stock.symbol ? (
                  <Loader2 size={16} className="shrink-0 text-primary animate-spin" />
                ) : (
                  <Plus size={16} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const { items, loading, addStock, removeStock } = useWatchlist()
  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const existingSymbols = useMemo(() => new Set(items.map(i => i.symbol)), [items])

  const handleRemove = async (id: string) => {
    setRemoving(id)
    await removeStock(id)
    setRemoving(null)
  }

  return (
    <DashboardShell noTopBar>
      <main className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
                  <Star size={24} className="text-primary relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                </div>
                <span className="text-gradient">Watchlist</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {loading ? "Loading…" : `${items.length} stock${items.length !== 1 ? "s" : ""} tracked`}
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90" />
              Add Stock
            </button>
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading your watchlist…</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                  <Star size={28} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Your watchlist is empty</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Add Nifty 50 stocks to track them here and get quick access to their analysis.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  <Plus size={16} /> Add your first stock
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="p-5 font-semibold">Stock</th>
                    <th className="p-5 font-semibold hidden md:table-cell">Sector</th>
                    <th className="p-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const meta = nifty50Stocks.find(s => s.symbol === item.symbol)
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-all duration-200"
                      >
                        {/* Stock */}
                        <td className="p-5">
                          <Link href={`/stock/${item.symbol}`} className="group flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-transform group-hover:scale-110">
                              {item.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.symbol}</p>
                              <p className="text-xs text-muted-foreground">{item.name}</p>
                            </div>
                          </Link>
                        </td>

                        {/* Sector */}
                        <td className="p-5 hidden md:table-cell">
                          {meta ? (
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground border border-white/5">
                              {meta.sector}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Actions */}
                        <td className="p-5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/stock/${item.symbol}`}
                              className="inline-flex rounded-lg bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:scale-105 border border-primary/20"
                            >
                              Analyze
                            </Link>
                            <button
                              onClick={() => handleRemove(item.id)}
                              disabled={removing === item.id}
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground border border-white/5 transition-all",
                                removing === item.id
                                  ? "opacity-50"
                                  : "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              )}
                              title="Remove from watchlist"
                            >
                              {removing === item.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
      </main>

      <AddStockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={async (symbol, name) => {
          await addStock(symbol, name)
          // keep modal open so user can add more
        }}
        existingSymbols={existingSymbols}
      />
    </DashboardShell>
  )
}
