def generate_signal(indicators):
    """
    Generate a BUY/SELL/HOLD signal using weighted multi-factor analysis.
    
    Weights:
      - Trend (25%): SMA50, SMA200, EMA20, EMA9, Ichimoku Tenkan, Ichimoku Kijun
      - Momentum (25%): MACD vs Signal, MACD Histogram, ROC, ADX
      - Oscillators (20%): RSI, Stochastic %K, CCI, Williams %R, MFI
      - Volume (15%): VWAP, OBV
      - Patterns (15%): Candlestick type, Crossover status
    """
    price = indicators.get("price", 0)

    # ─── TREND (25%) ─────────────────────────────────────
    trend_checks = [
        price > indicators.get("SMA50", 0),
        price > indicators.get("SMA200", 0),
        price > indicators.get("EMA20", 0),
        price > indicators.get("EMA9", 0),
        price > indicators.get("ichimokuTenkan", 0),
        price > indicators.get("ichimokuKijun", 0),
    ]
    trend_score = (sum(trend_checks) / len(trend_checks)) * 100

    # ─── MOMENTUM (25%) ──────────────────────────────────
    momentum_checks = [
        indicators.get("MACD", 0) > indicators.get("MACDSignal", 0),
        indicators.get("MACDHist", 0) > 0,
        indicators.get("ROC", 0) > 0,
        indicators.get("ADX", 0) > 25,
    ]
    momentum_score = (sum(momentum_checks) / len(momentum_checks)) * 100

    # ─── OSCILLATORS (20%) ───────────────────────────────
    rsi = indicators.get("RSI", 50)
    stoch_k = indicators.get("stochK", 50)
    cci = indicators.get("CCI", 0)
    williams_r = indicators.get("WilliamsR", -50)
    mfi = indicators.get("MFI", 50)

    osc_scores = [
        1 if rsi < 30 else (0 if rsi > 70 else 0.5),
        1 if stoch_k < 20 else (0 if stoch_k > 80 else 0.5),
        1 if cci < -100 else (0 if cci > 100 else 0.5),
        1 if williams_r < -80 else (0 if williams_r > -20 else 0.5),
        1 if mfi < 20 else (0 if mfi > 80 else 0.5),
    ]
    oscillator_score = (sum(osc_scores) / len(osc_scores)) * 100

    # ─── VOLUME (15%) ────────────────────────────────────
    volume_checks = [
        price > indicators.get("VWAP", 0),
        indicators.get("OBV", 0) > 0,
    ]
    volume_score = (sum(volume_checks) / len(volume_checks)) * 100

    # ─── PATTERNS (15%) ──────────────────────────────────
    candle = indicators.get("candle", {})
    candle_score = 1 if candle.get("type") == "bullish" else (0 if candle.get("type") == "bearish" else 0.5)

    crossovers = indicators.get("crossovers", {})
    if crossovers:
        cross_bulls = sum(1 for c in crossovers.values() if c.get("status") == "Bullish")
        cross_score = cross_bulls / len(crossovers)
    else:
        cross_score = 0.5

    pattern_score = ((candle_score + cross_score) / 2) * 100

    # ─── WEIGHTED OVERALL SCORE ──────────────────────────
    overall = round(
        trend_score * 0.25 +
        momentum_score * 0.25 +
        oscillator_score * 0.20 +
        volume_score * 0.15 +
        pattern_score * 0.15
    )

    # ─── DETERMINE SIGNAL ────────────────────────────────
    if overall >= 60:
        signal = "BUY"
    elif overall <= 40:
        signal = "SELL"
    else:
        signal = "HOLD"

    # ─── COUNT INDIVIDUAL SIGNALS ────────────────────────
    buy_signals = sum([
        price > indicators.get("SMA50", 0),
        price > indicators.get("SMA200", 0),
        price > indicators.get("EMA20", 0),
        price > indicators.get("VWAP", 0),
        indicators.get("MACD", 0) > indicators.get("MACDSignal", 0),
        indicators.get("ROC", 0) > 0,
        rsi < 30,
        stoch_k < 20,
        cci < -100,
        williams_r < -80,
        mfi < 20,
    ])

    sell_signals = sum([
        price < indicators.get("SMA50", 0),
        price < indicators.get("SMA200", 0),
        price < indicators.get("EMA20", 0),
        price < indicators.get("VWAP", 0),
        indicators.get("MACD", 0) < indicators.get("MACDSignal", 0),
        indicators.get("ROC", 0) < 0,
        rsi > 70,
        stoch_k > 80,
        cci > 100,
        williams_r > -20,
        mfi > 80,
    ])

    neutral_signals = 11 - buy_signals - sell_signals

    return {
        "signal": signal,
        "overall_score": overall,
        "confidence": round(overall / 100, 2),
        "scores": {
            "trend": round(trend_score),
            "momentum": round(momentum_score),
            "oscillators": round(oscillator_score),
            "volume": round(volume_score),
            "patterns": round(pattern_score),
        },
        "counts": {
            "buy": buy_signals,
            "sell": sell_signals,
            "neutral": neutral_signals,
        }
    }
