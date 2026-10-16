"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Menu } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"
import { nifty50Stocks } from "@/lib/stocks"
import { useSidebar } from "@/lib/context/sidebar"
import { cn } from "@/lib/utils"

/** NSE cash market hours: Mon–Fri 09:15–15:30 IST (exchange holidays not modelled). */
function nseStatus(now: Date) {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const day = ist.getDay()
  const mins = ist.getHours() * 60 + ist.getMinutes()
  const open = day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30
  const time = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
  return { open, time }
}

function MarketClock() {
  const [status, setStatus] = useState<{ open: boolean; time: string } | null>(null)
  useEffect(() => {
    const tick = () => setStatus(nseStatus(new Date()))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  if (!status) return null
  return (
    <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex" title="NSE cash market, Mon–Fri 09:15–15:30 IST">
      <span className={cn("h-2 w-2 rounded-full", status.open ? "bg-up" : "bg-faint-foreground")} aria-hidden="true" />
      <span>{status.open ? "NSE open" : "NSE closed"}</span>
      <span className="tabular text-faint-foreground">{status.time} IST</span>
    </div>
  )
}


export function TopBar() {
  const router = useRouter()
  const { setMobileOpen } = useSidebar()
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        onClick={() => setMobileOpen(true)}
        className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyNavigation}
          placeholder="Search stocks"
          aria-label="Search Nifty 50 stocks"
          className="peer h-9 w-full rounded-md border border-line bg-surface pl-9 pr-14 text-sm text-foreground placeholder:text-faint-foreground transition-colors hover:border-line-strong focus:border-primary/60 focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[11px] text-faint-foreground sm:inline-block peer-focus:opacity-0">
          ⌘K
        </kbd>

        {isOpen && searchQuery.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-11 z-50 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] custom-scrollbar"
            role="listbox"
          >
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock, index) => (
                <button
                  key={stock.symbol}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => navigateToStock(stock.symbol)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  <StockLogo symbol={stock.symbol} size={28} className="rounded-md" fallbackClassName="text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{stock.symbol}</span>
                    <span className="block truncate text-xs text-muted-foreground">{stock.name}</span>
                  </span>
                  <span className="text-xs text-faint-foreground">{stock.sector}</span>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No Nifty 50 stock matches &ldquo;{searchQuery}&rdquo;. Try a symbol like TCS or a name like Infosys.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <MarketClock />
      </div>
    </header>
  )
}
