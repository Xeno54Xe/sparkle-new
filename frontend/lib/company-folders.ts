import { nifty50Stocks } from "./stocks"

// Stock symbol → company folder name under integrated-backend/outputs/.
// The names come from nifty50.json and must match the report pipeline's folders.
export const COMPANY_FOLDERS: Record<string, string> = Object.fromEntries(
  nifty50Stocks.filter(s => s.folder).map(s => [s.symbol, s.folder as string])
)

export function companyFolder(symbol: string) {
  return COMPANY_FOLDERS[symbol] || symbol
}
