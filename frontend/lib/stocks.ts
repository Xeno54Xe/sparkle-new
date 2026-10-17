import list from "./nifty50.json"

// The covered stocks live in nifty50.json, which the backend reads too.
export interface Stock {
  symbol: string
  name: string
  sector: string
  /** Yahoo Finance ticker, e.g. "TCS.NS" */
  yahoo: string
  /** Company folder under integrated-backend/outputs/, or null when there are no reports */
  folder: string | null
  /** Domain used for the favicon logo */
  logo: string | null
}

export const nifty50Stocks: Stock[] = list.stocks

export function getStockBySymbol(symbol: string): Stock | undefined {
  return nifty50Stocks.find(
    (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase()
  )
}
