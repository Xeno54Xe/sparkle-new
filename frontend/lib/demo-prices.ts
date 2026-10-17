import { nifty50Stocks, type Stock } from "./stocks"

// Fixed demo prices, not real quotes. Used by the offline fallback in
// app/api/backend (when the Python backend can't be reached) and by the
// portfolio and options simulators, which still run on demo data.
export const DEMO_PRICES: Record<string, { price: number; change: number }> = {
  RELIANCE: { price: 2456.75, change: 1.23 },
  TCS: { price: 3892.4, change: -0.45 },
  HDFCBANK: { price: 1678.9, change: 0.87 },
  INFY: { price: 1534.25, change: -1.12 },
  ICICIBANK: { price: 1023.5, change: 2.34 },
  HINDUNILVR: { price: 2567.8, change: 0.56 },
  ITC: { price: 456.35, change: 1.78 },
  SBIN: { price: 634.2, change: -0.23 },
  BHARTIARTL: { price: 1245.6, change: 1.45 },
  KOTAKBANK: { price: 1789.3, change: -0.67 },
  LT: { price: 3456.7, change: 0.98 },
  AXISBANK: { price: 1098.45, change: 1.56 },
  MARUTI: { price: 10234.5, change: 2.12 },
  HCLTECH: { price: 1456.8, change: -0.89 },
  SUNPHARMA: { price: 1123.45, change: 1.34 },
  TITAN: { price: 3234.6, change: 0.78 },
  BAJFINANCE: { price: 6789.25, change: -1.45 },
  WIPRO: { price: 456.7, change: 0.23 },
  ULTRACEMCO: { price: 8765.4, change: 1.67 },
  ONGC: { price: 234.56, change: -0.56 },
  NTPC: { price: 345.8, change: 2.45 },
  POWERGRID: { price: 267.9, change: 1.23 },
  "M&M": { price: 1567.8, change: 0.45 },
  TMPV: { price: 678.9, change: -2.34 },
  JSWSTEEL: { price: 789.45, change: 1.89 },
  TATASTEEL: { price: 134.56, change: -0.78 },
  ADANIENT: { price: 2345.7, change: 3.45 },
  ADANIPORTS: { price: 1234.5, change: 1.12 },
  COALINDIA: { price: 423.8, change: 0.67 },
  BPCL: { price: 567.9, change: -1.23 },
  GRASIM: { price: 2123.45, change: 0.89 },
  DRREDDY: { price: 5678.9, change: 1.56 },
  CIPLA: { price: 1234.7, change: -0.45 },
  APOLLOHOSP: { price: 5890.3, change: 2.34 },
  EICHERMOT: { price: 3456.8, change: 0.12 },
  BAJAJFINSV: { price: 1567.4, change: -0.89 },
  "BAJAJ-AUTO": { price: 8234.5, change: 1.78 },
  HEROMOTOCO: { price: 4123.6, change: 0.56 },
  TECHM: { price: 1234.9, change: -1.34 },
  HINDALCO: { price: 523.45, change: 2.12 },
  INDUSINDBK: { price: 1456.7, change: -0.67 },
  SBILIFE: { price: 1345.8, change: 0.34 },
  HDFCLIFE: { price: 623.4, change: 1.45 },
  DIVISLAB: { price: 3567.8, change: -0.23 },
  BRITANNIA: { price: 4890.6, change: 0.78 },
  NESTLEIND: { price: 23456.7, change: 1.12 },
  TATACONSUM: { price: 1023.45, change: -0.56 },
  LTM: { price: 5234.8, change: 2.67 },
  ASIANPAINT: { price: 2876.4, change: 0.42 },
  SHRIRAMFIN: { price: 612.35, change: 1.08 },
}

export type DemoStock = Stock & { price: number; change: number }

export function withDemoPrice(stock: Stock): DemoStock {
  return { ...stock, ...(DEMO_PRICES[stock.symbol] ?? { price: 100, change: 0 }) }
}

export const demoStocks: DemoStock[] = nifty50Stocks.map(withDemoPrice)
