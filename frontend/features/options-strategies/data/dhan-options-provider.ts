import type { OptionContract, OptionType } from "../domain/types"

type DhanUnderlyingConfig = {
  scrip: number
  segment: string
  lotSize?: number
}

type DhanConfigStatus =
  | { ok: false; reason: string }
  | { ok: true; clientId: string; accessToken: string; underlying: DhanUnderlyingConfig }

type DhanOptionSide = {
  security_id?: number
  top_bid_price?: number
  top_ask_price?: number
  last_price?: number
  volume?: number
  oi?: number
  implied_volatility?: number
  greeks?: {
    delta?: number
    gamma?: number
    theta?: number
    vega?: number
  }
}

type DhanOptionChainResponse = {
  data?: {
    last_price?: number
    oc?: Record<string, { ce?: DhanOptionSide; pe?: DhanOptionSide }>
    status?: string
  }
  status?: string
  errorMessage?: string
  errorCode?: string
}

type DhanExpiryResponse = {
  data?: string[]
  status?: string
  errorMessage?: string
  errorCode?: string
}

const DHAN_BASE_URL = "https://api.dhan.co/v2"

const DEFAULT_UNDERLYINGS: Record<string, DhanUnderlyingConfig> = {
  NIFTY: { scrip: 13, segment: "IDX_I" },
  BANKNIFTY: { scrip: 25, segment: "IDX_I" },
  FINNIFTY: { scrip: 27, segment: "IDX_I" },
  MIDCPNIFTY: { scrip: 442, segment: "IDX_I" },
}

function readUnderlyingMap() {
  const raw = process.env.DHAN_UNDERLYING_MAP
  if (!raw) return DEFAULT_UNDERLYINGS

  try {
    const parsed = JSON.parse(raw) as Record<string, DhanUnderlyingConfig>
    return Object.fromEntries(
      Object.entries({ ...DEFAULT_UNDERLYINGS, ...parsed }).map(([symbol, config]) => [
        symbol.toUpperCase(),
        config,
      ])
    )
  } catch {
    return DEFAULT_UNDERLYINGS
  }
}

export function getDhanConfigStatus(symbol: string): DhanConfigStatus {
  const clientId = process.env.DHAN_CLIENT_ID
  const accessToken = process.env.DHAN_ACCESS_TOKEN
  const underlying = readUnderlyingMap()[symbol.toUpperCase()]

  if (!clientId || !accessToken) {
    return {
      ok: false,
      reason: "Add DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN to enable live option-chain recommendations.",
    }
  }

  if (!underlying) {
    return {
      ok: false,
      reason: `Add ${symbol.toUpperCase()} to DHAN_UNDERLYING_MAP with its Dhan underlying security id and segment.`,
    }
  }

  return { ok: true, clientId, accessToken, underlying }
}

function dhanHeaders(clientId: string, accessToken: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "access-token": accessToken,
    "client-id": clientId,
  }
}

async function dhanPost<T>(path: string, body: unknown, clientId: string, accessToken: string): Promise<T> {
  const response = await fetch(`${DHAN_BASE_URL}${path}`, {
    method: "POST",
    headers: dhanHeaders(clientId, accessToken),
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.errorMessage ?? data?.message ?? `Dhan request failed with HTTP ${response.status}`
    throw new Error(message)
  }

  return data as T
}

function contractSymbol(symbol: string, expiry: string, strike: number, optionType: OptionType, securityId?: number) {
  if (securityId) return `DHAN:${securityId}`
  return `${symbol.toUpperCase()}-${expiry}-${strike}-${optionType === "call" ? "CE" : "PE"}`
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function liquidityScore(option: DhanOptionSide) {
  const bid = numberOrNull(option.top_bid_price) ?? 0
  const ask = numberOrNull(option.top_ask_price) ?? 0
  const last = numberOrNull(option.last_price) ?? 0
  const volume = numberOrNull(option.volume) ?? 0
  const oi = numberOrNull(option.oi) ?? 0
  const reference = ask > 0 && bid > 0 ? (ask + bid) / 2 : last
  const spread = ask > 0 && bid > 0 && reference > 0 ? (ask - bid) / reference : 0.5

  let score = 40
  if (volume > 0) score += Math.min(20, Math.log10(volume + 1) * 4)
  if (oi > 0) score += Math.min(20, Math.log10(oi + 1) * 4)
  if (spread <= 0.04) score += 20
  else if (spread <= 0.1) score += 12
  else if (spread <= 0.2) score += 4
  else score -= 12

  return Math.max(0, Math.min(100, Math.round(score)))
}

function normalizeContract(
  symbol: string,
  expiry: string,
  strikeText: string,
  optionType: OptionType,
  option: DhanOptionSide,
  underlyingPrice: number,
  lotSize: number | undefined
): OptionContract {
  const strike = Number(strikeText)

  return {
    contractSymbol: contractSymbol(symbol, expiry, strike, optionType, option.security_id),
    underlyingSymbol: symbol.toUpperCase(),
    underlyingPrice,
    exchange: "NSE",
    currency: "INR",
    expiry,
    strike,
    optionType,
    bid: numberOrNull(option.top_bid_price),
    ask: numberOrNull(option.top_ask_price),
    lastPrice: numberOrNull(option.last_price),
    volume: numberOrNull(option.volume),
    openInterest: numberOrNull(option.oi),
    impliedVolatility: numberOrNull(option.implied_volatility),
    delta: numberOrNull(option.greeks?.delta),
    gamma: numberOrNull(option.greeks?.gamma),
    theta: numberOrNull(option.greeks?.theta),
    vega: numberOrNull(option.greeks?.vega),
    quoteTimestamp: new Date().toISOString(),
    lotSize: lotSize ?? null,
    liquidityScore: liquidityScore(option),
  }
}

export async function fetchDhanExpiries(symbol: string) {
  const status = getDhanConfigStatus(symbol)
  if (!status.ok) throw new Error(status.reason)

  const body = {
    UnderlyingScrip: status.underlying.scrip,
    UnderlyingSeg: status.underlying.segment,
  }
  const data = await dhanPost<DhanExpiryResponse>("/optionchain/expirylist", body, status.clientId, status.accessToken)
  if (!Array.isArray(data.data)) {
    throw new Error(data.errorMessage ?? "Dhan did not return an expiry list.")
  }

  return data.data
}

export async function fetchDhanOptionChain(symbol: string, expiry: string) {
  const status = getDhanConfigStatus(symbol)
  if (!status.ok) throw new Error(status.reason)

  const body = {
    UnderlyingScrip: status.underlying.scrip,
    UnderlyingSeg: status.underlying.segment,
    Expiry: expiry,
  }
  const data = await dhanPost<DhanOptionChainResponse>("/optionchain", body, status.clientId, status.accessToken)
  const chain = data.data?.oc
  const underlyingPrice = numberOrNull(data.data?.last_price)

  if (!chain || underlyingPrice == null) {
    throw new Error(data.errorMessage ?? "Dhan did not return a usable option chain.")
  }

  const contracts = Object.entries(chain).flatMap(([strike, sides]) => {
    const normalized: OptionContract[] = []
    if (sides.ce) normalized.push(normalizeContract(symbol, expiry, strike, "call", sides.ce, underlyingPrice, status.underlying.lotSize))
    if (sides.pe) normalized.push(normalizeContract(symbol, expiry, strike, "put", sides.pe, underlyingPrice, status.underlying.lotSize))
    return normalized
  })

  return {
    contracts,
    underlyingPrice,
    timestamp: new Date().toISOString(),
  }
}
