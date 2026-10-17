// Stock symbol → company logo URL mapping
// Served through the /api/logo proxy (Google favicon service)
// Falls back to first-letter avatar if logo fails to load
import { nifty50Stocks } from "./stocks"

const LOGO_DOMAINS: Record<string, string> = Object.fromEntries(
  nifty50Stocks.filter(s => s.logo).map(s => [s.symbol, s.logo as string])
)

export function getStockLogoUrl(symbol: string): string {
  const domain = LOGO_DOMAINS[symbol]
  if (domain) {
    return `/api/logo?domain=${encodeURIComponent(domain)}`
  }
  return ""
}

export function hasLogo(symbol: string): boolean {
  return symbol in LOGO_DOMAINS
}
