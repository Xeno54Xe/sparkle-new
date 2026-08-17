import type { RiskPreference, StrategyGoal, TechnicalSnapshot } from "@/features/options-strategies/domain/types"
import { getDhanConfigStatus, fetchDhanExpiries, fetchDhanOptionChain } from "@/features/options-strategies/data/dhan-options-provider"
import { buildLiveRecommendations, selectModelExpiry } from "@/features/options-strategies/domain/live-recommendation-engine"

const VALID_RISKS = new Set<RiskPreference>(["lower-risk", "balanced", "high-risk"])
const VALID_GOALS = new Set<StrategyGoal>(["not-sure", "upside", "downside", "range-bound", "big-move"])

function parseRisk(value: string | null): RiskPreference {
  return value && VALID_RISKS.has(value as RiskPreference) ? value as RiskPreference : "balanced"
}

function parseGoal(value: string | null): StrategyGoal {
  return value && VALID_GOALS.has(value as StrategyGoal) ? value as StrategyGoal : "not-sure"
}

function parseNumber(value: string | null, fallback = 0) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseOptionalNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseTechnical(searchParams: URLSearchParams): TechnicalSnapshot | null {
  const signal = searchParams.get("signal")
  const normalizedSignal = signal === "BUY" || signal === "SELL" || signal === "HOLD" ? signal : null

  if (!normalizedSignal && !searchParams.has("overallScore") && !searchParams.has("rsi") && !searchParams.has("adx")) {
    return null
  }

  return {
    signal: normalizedSignal,
    overallScore: parseOptionalNumber(searchParams.get("overallScore")),
    rsi: parseOptionalNumber(searchParams.get("rsi")),
    adx: parseOptionalNumber(searchParams.get("adx")),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim().toUpperCase()

  if (!symbol) {
    return Response.json({ error: "Missing symbol" }, { status: 400 })
  }

  const configStatus = getDhanConfigStatus(symbol)
  if (!configStatus.ok) {
    return Response.json({
      mode: "needs-config",
      provider: "DhanHQ",
      symbol,
      underlyingPrice: null,
      timestamp: new Date().toISOString(),
      expiries: [],
      recommendations: [],
      message: configStatus.reason,
      setupHint: "Add DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN and DHAN_UNDERLYING_MAP to .env.local, then restart the Next.js dev server.",
    })
  }

  try {
    const risk = parseRisk(searchParams.get("risk"))
    const goal = parseGoal(searchParams.get("goal"))
    const change = parseNumber(searchParams.get("change"), 0)
    const requestedSpot = parseNumber(searchParams.get("spot"), Number.NaN)
    const technical = parseTechnical(searchParams)

    const expiries = await fetchDhanExpiries(symbol)
    const selectedExpiry = searchParams.get("expiry") || selectModelExpiry(expiries, goal, risk)

    if (!selectedExpiry) {
      return Response.json({
        mode: "error",
        provider: "DhanHQ",
        symbol,
        underlyingPrice: null,
        timestamp: new Date().toISOString(),
        expiries,
        recommendations: [],
        message: "No active option expiries were returned for this symbol.",
      })
    }

    const chain = await fetchDhanOptionChain(symbol, selectedExpiry)
    const spotPrice = Number.isFinite(requestedSpot) && requestedSpot > 0 ? requestedSpot : chain.underlyingPrice

    if (spotPrice == null || spotPrice <= 0) {
      return Response.json({
        mode: "error",
        provider: "DhanHQ",
        symbol,
        underlyingPrice: chain.underlyingPrice,
        timestamp: chain.timestamp,
        expiries,
        recommendations: [],
        message: "DhanHQ returned contracts but no usable underlying spot price.",
      }, { status: 502 })
    }

    const recommendations = buildLiveRecommendations({
      symbol,
      change,
      spotPrice,
      expiries: [selectedExpiry],
      contracts: chain.contracts,
      goal,
      risk,
      technical,
      provider: "DhanHQ",
    })

    return Response.json({
      mode: "live",
      provider: "DhanHQ",
      symbol,
      underlyingPrice: chain.underlyingPrice,
      timestamp: chain.timestamp,
      expiries,
      recommendations,
      message: recommendations.length
        ? "Live option-chain recommendations are ready."
        : "Option chain loaded, but no strategy passed the model's liquidity and pricing filters.",
    })
  } catch (error) {
    return Response.json({
      mode: "error",
      provider: "DhanHQ",
      symbol,
      underlyingPrice: null,
      timestamp: new Date().toISOString(),
      expiries: [],
      recommendations: [],
      message: error instanceof Error ? error.message : "Unable to load live options recommendations.",
    }, { status: 502 })
  }
}
