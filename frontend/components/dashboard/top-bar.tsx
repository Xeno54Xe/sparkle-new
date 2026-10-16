"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Settings } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"
import { nifty50Stocks } from "@/lib/stocks"


export function TopBar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navigateToStock = (symbol: string) => {
    setSearchQuery("")
    setIsOpen(false)
    router.push(`/stock/${symbol}`)
  }

  const filteredStocks = nifty50Stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < filteredStocks.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" && filteredStocks[selectedIndex]) {
      navigateToStock(filteredStocks[selectedIndex].symbol)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-background/40 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative flex w-full max-w-md items-center">
        <Search size={18} className="absolute left-3 z-10 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyNavigation}
          placeholder="Search Nifty 50 stocks..."
          className="peer h-10 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-300 hover:bg-black/40 focus:border-primary/50 focus:bg-black/60 focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-inner"
        />
        <kbd className="absolute right-3 hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block pointer-events-none transition-opacity peer-focus:opacity-0">
          Cmd+K
        </kbd>

        {/* Dropdown - only show when typing */}
        {isOpen && searchQuery.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-14 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 glass-card shadow-2xl z-50 custom-scrollbar origin-top animate-in fade-in zoom-in-95 duration-200"
          >
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock, index) => (
                <button
                  key={stock.symbol}
                  onClick={() => navigateToStock(stock.symbol)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200 border-b border-white/5 last:border-0 ${
                    index === selectedIndex ? "bg-white/10 pl-5" : "hover:bg-white/5 hover:pl-5"
                  }`}
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    <StockLogo symbol={stock.symbol} size={32} className="rounded-full" fallbackClassName="text-[10px] text-muted-foreground font-bold" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground tracking-tight">{stock.symbol}</span>
                    <span className="text-xs text-muted-foreground">{stock.name}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Search className="mx-auto mb-2 opacity-20" size={32} />
                No stocks found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-muted-foreground transition-all duration-300 hover:bg-white/10 hover:text-foreground hover:scale-105 hover:shadow-lg hover:rotate-90">
          <Settings size={18} />
        </Link>
      </div>
    </header>
  )
}
