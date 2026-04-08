"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Settings, TrendingUp, TrendingDown } from "lucide-react"
import { StockLogo } from "@/components/ui/stock-logo"

const nifty50Stocks = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2456.75, change: 1.23 },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3892.40, change: -0.45 },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1678.90, change: 0.87 },
  { symbol: "INFY", name: "Infosys", price: 1534.25, change: -1.12 },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1023.50, change: 2.34 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", price: 2567.80, change: 0.56 },
  { symbol: "ITC", name: "ITC Limited", price: 456.35, change: 1.78 },
  { symbol: "SBIN", name: "State Bank of India", price: 634.20, change: -0.23 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1245.60, change: 1.45 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", price: 1789.30, change: -0.67 },
  { symbol: "LT", name: "Larsen & Toubro", price: 3456.70, change: 0.98 },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1098.45, change: 1.56 },
  { symbol: "ASIANPAINT", name: "Asian Paints", price: 2876.90, change: -0.34 },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 10234.50, change: 2.12 },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1456.80, change: -0.89 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", price: 1123.45, change: 1.34 },
  { symbol: "TITAN", name: "Titan Company", price: 3234.60, change: 0.78 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 6789.25, change: -1.45 },
  { symbol: "WIPRO", name: "Wipro", price: 456.70, change: 0.23 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", price: 8765.40, change: 1.67 },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", price: 234.56, change: -0.56 },
  { symbol: "NTPC", name: "NTPC Limited", price: 345.80, change: 2.45 },
  { symbol: "POWERGRID", name: "Power Grid Corp", price: 267.90, change: 1.23 },
  { symbol: "M&M", name: "Mahindra & Mahindra", price: 1567.80, change: 0.45 },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 678.90, change: -2.34 },
  { symbol: "JSWSTEEL", name: "JSW Steel", price: 789.45, change: 1.89 },
  { symbol: "TATASTEEL", name: "Tata Steel", price: 134.56, change: -0.78 },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2345.70, change: 3.45 },
  { symbol: "ADANIPORTS", name: "Adani Ports", price: 1234.50, change: 1.12 },
  { symbol: "COALINDIA", name: "Coal India", price: 423.80, change: 0.67 },
  { symbol: "BPCL", name: "Bharat Petroleum", price: 567.90, change: -1.23 },
  { symbol: "GRASIM", name: "Grasim Industries", price: 2123.45, change: 0.89 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", price: 5678.90, change: 1.56 },
  { symbol: "CIPLA", name: "Cipla", price: 1234.70, change: -0.45 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", price: 5890.30, change: 2.34 },
  { symbol: "EICHERMOT", name: "Eicher Motors", price: 3456.80, change: 0.12 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", price: 1567.40, change: -0.89 },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", price: 8234.50, change: 1.78 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", price: 4123.60, change: 0.56 },
  { symbol: "TECHM", name: "Tech Mahindra", price: 1234.90, change: -1.34 },
  { symbol: "HINDALCO", name: "Hindalco Industries", price: 523.45, change: 2.12 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", price: 1456.70, change: -0.67 },
  { symbol: "SBILIFE", name: "SBI Life Insurance", price: 1345.80, change: 0.34 },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", price: 623.40, change: 1.45 },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", price: 3567.80, change: -0.23 },
  { symbol: "BRITANNIA", name: "Britannia Industries", price: 4890.60, change: 0.78 },
  { symbol: "NESTLEIND", name: "Nestle India", price: 23456.70, change: 1.12 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", price: 1023.45, change: -0.56 },
  { symbol: "LTI", name: "LTIMindtree", price: 5234.80, change: 2.67 },
  { symbol: "SHREECEM", name: "Shree Cement", price: 26789.30, change: 0.45 },
]

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
                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition-all duration-200 border-b border-white/5 last:border-0 ${
                    index === selectedIndex ? "bg-white/10 pl-5" : "hover:bg-white/5 hover:pl-5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                      <StockLogo symbol={stock.symbol} fallbackClassName="text-[10px] text-muted-foreground font-bold" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground tracking-tight">
                        {stock.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {stock.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {stock.price.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
                        stock.change >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {stock.change >= 0 ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      {stock.change >= 0 ? "+" : ""}
                      {stock.change.toFixed(2)}%
                    </span>
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
