// Stock symbol → company logo URL mapping
// Uses Clearbit Logo API (free, no key needed): https://logo.clearbit.com/:domain
// Falls back to first-letter avatar if logo fails to load

const LOGO_DOMAINS: Record<string, string> = {
  RELIANCE: "ril.com",
  TCS: "tcs.com",
  HDFCBANK: "hdfcbank.com",
  INFY: "infosys.com",
  ICICIBANK: "icicibank.com",
  HINDUNILVR: "hul.co.in",
  ITC: "itcportal.com",
  SBIN: "sbi.co.in",
  BHARTIARTL: "airtel.in",
  KOTAKBANK: "kotak.com",
  LT: "larsentoubro.com",
  AXISBANK: "axisbank.com",
  ASIANPAINT: "asianpaints.com",
  MARUTI: "marutisuzuki.com",
  HCLTECH: "hcltech.com",
  SUNPHARMA: "sunpharma.com",
  TITAN: "titan.co.in",
  BAJFINANCE: "bajajfinance.in",
  WIPRO: "wipro.com",
  ULTRACEMCO: "ultratechcement.com",
  ONGC: "ongcindia.com",
  NTPC: "ntpc.co.in",
  POWERGRID: "powergrid.in",
  "M&M": "mahindra.com",
  TATAMOTORS: "tatamotors.com",
  JSWSTEEL: "jsw.in",
  TATASTEEL: "tatasteel.com",
  ADANIENT: "adani.com",
  ADANIPORTS: "adaniports.com",
  COALINDIA: "coalindia.in",
  BPCL: "bharatpetroleum.in",
  GRASIM: "grasim.com",
  DRREDDY: "drreddys.com",
  CIPLA: "cipla.com",
  APOLLOHOSP: "apollohospitals.com",
  EICHERMOT: "eicher.in",
  BAJAJFINSV: "bajajfinserv.in",
  "BAJAJ-AUTO": "bajajauto.com",
  HEROMOTOCO: "heromotocorp.com",
  TECHM: "techmahindra.com",
  HINDALCO: "hindalco.com",
  INDUSINDBK: "indusind.com",
  SBILIFE: "sbilife.co.in",
  HDFCLIFE: "hdfclife.com",
  DIVISLAB: "divislabs.com",
  BRITANNIA: "britannia.co.in",
  NESTLEIND: "nestle.in",
  TATACONSUM: "tataconsumer.com",
  LTIM: "ltimindtree.com",
  UPL: "upl-ltd.com",
}

export function getStockLogoUrl(symbol: string): string {
  const domain = LOGO_DOMAINS[symbol]
  if (domain) {
    return `https://logo.clearbit.com/${domain}`
  }
  return ""
}

export function hasLogo(symbol: string): boolean {
  return symbol in LOGO_DOMAINS
}
