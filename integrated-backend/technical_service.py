import pandas_ta as ta
import pandas as pd
import numpy as np

def get_indicators(df):
    """Calculate all technical indicators from price data"""
    close = df["Close"].squeeze()
    high = df["High"].squeeze()
    low = df["Low"].squeeze()
    volume = df["Volume"].squeeze()

    result = {}

    # ─── TREND INDICATORS ────────────────────────────────
    # SMA (Simple Moving Average)
    sma50 = ta.sma(close, length=50)
    sma200 = ta.sma(close, length=200)
    result["SMA50"] = safe_last(sma50)
    result["SMA200"] = safe_last(sma200)

    # EMA (Exponential Moving Average)
    ema9 = ta.ema(close, length=9)
    ema20 = ta.ema(close, length=20)
    result["EMA9"] = safe_last(ema9)
    result["EMA20"] = safe_last(ema20)

    # Ichimoku
    ichimoku = ta.ichimoku(high, low, close)
    if ichimoku is not None and len(ichimoku) >= 2:
        ichi_df = ichimoku[0]  # ichimoku returns a tuple of DataFrames
        if "ITS_9" in ichi_df.columns:
            result["ichimokuTenkan"] = safe_last(ichi_df["ITS_9"])
        if "IKS_26" in ichi_df.columns:
            result["ichimokuKijun"] = safe_last(ichi_df["IKS_26"])
    if "ichimokuTenkan" not in result:
        result["ichimokuTenkan"] = safe_last(ta.sma(close, length=9))
    if "ichimokuKijun" not in result:
        result["ichimokuKijun"] = safe_last(ta.sma(close, length=26))

    # ─── MOMENTUM INDICATORS ─────────────────────────────
    # MACD
    macd = ta.macd(close)
    if macd is not None:
        result["MACD"] = safe_last(macd.get("MACD_12_26_9"))
        result["MACDSignal"] = safe_last(macd.get("MACDs_12_26_9"))
        result["MACDHist"] = safe_last(macd.get("MACDh_12_26_9"))
    else:
        result["MACD"] = 0
        result["MACDSignal"] = 0
        result["MACDHist"] = 0

    # ADX (Average Directional Index)
    adx = ta.adx(high, low, close, length=14)
    if adx is not None and "ADX_14" in adx.columns:
        result["ADX"] = safe_last(adx["ADX_14"])
    else:
        result["ADX"] = 0

    # ROC (Rate of Change)
    roc = ta.roc(close, length=12)
    result["ROC"] = safe_last(roc)

    # ─── OSCILLATORS ─────────────────────────────────────
    # RSI
    rsi = ta.rsi(close, length=14)
    result["RSI"] = safe_last(rsi)

    # Stochastic
    stoch = ta.stoch(high, low, close)
    if stoch is not None:
        result["stochK"] = safe_last(stoch.get("STOCHk_14_3_3"))
        result["stochD"] = safe_last(stoch.get("STOCHd_14_3_3"))
    else:
        result["stochK"] = 50
        result["stochD"] = 50

    # CCI (Commodity Channel Index)
    cci = ta.cci(high, low, close, length=20)
    result["CCI"] = safe_last(cci)

    # Williams %R
    willr = ta.willr(high, low, close, length=14)
    result["WilliamsR"] = safe_last(willr)

    # MFI (Money Flow Index)
    mfi = ta.mfi(high, low, close, volume, length=14)
    result["MFI"] = safe_last(mfi)

    # ─── VOLATILITY ──────────────────────────────────────
    # ATR (Average True Range)
    atr = ta.atr(high, low, close, length=14)
    result["ATR"] = safe_last(atr)

    # Bollinger Bands
    bbands = ta.bbands(close, length=20, std=2)
    if bbands is not None:
        result["bollingerUpper"] = safe_last(bbands.get("BBU_20_2.0"))
        result["bollingerMiddle"] = safe_last(bbands.get("BBM_20_2.0"))
        result["bollingerLower"] = safe_last(bbands.get("BBL_20_2.0"))
    else:
        last_price = float(close.iloc[-1])
        result["bollingerUpper"] = round(last_price * 1.02, 2)
        result["bollingerMiddle"] = round(last_price, 2)
        result["bollingerLower"] = round(last_price * 0.98, 2)

    # ─── VOLUME ──────────────────────────────────────────
    # OBV (On-Balance Volume)
    obv = ta.obv(close, volume)
    result["OBV"] = safe_last(obv)

    # VWAP (Volume Weighted Average Price)
    try:
        vwap = ta.vwap(high, low, close, volume)
        result["VWAP"] = safe_last(vwap)
    except:
        # VWAP can fail on daily data, calculate manually
        result["VWAP"] = round(float((close * volume).tail(20).sum() / volume.tail(20).sum()), 2)

    # ─── CURRENT PRICE ───────────────────────────────────
    result["price"] = round(float(close.iloc[-1]), 2)

    # ─── SUPPORT & RESISTANCE (Pivot Points) ─────────────
    last_high = float(high.iloc[-1])
    last_low = float(low.iloc[-1])
    last_close = float(close.iloc[-1])
    pivot = (last_high + last_low + last_close) / 3

    result["pivotPoint"] = round(pivot, 2)
    result["support"] = {
        "S1": round(2 * pivot - last_high, 2),
        "S2": round(pivot - (last_high - last_low), 2),
        "S3": round(last_low - 2 * (last_high - pivot), 2),
    }
    result["resistance"] = {
        "R1": round(2 * pivot - last_low, 2),
        "R2": round(pivot + (last_high - last_low), 2),
        "R3": round(last_high + 2 * (pivot - last_low), 2),
    }

    return result


def get_candlestick_pattern(df):
    """Detect the latest candlestick pattern"""
    close = df["Close"].squeeze()
    opn = df["Open"].squeeze()
    high = df["High"].squeeze()
    low = df["Low"].squeeze()

    # Get last two candles
    if len(df) < 2:
        return {"latest": "Unknown", "type": "neutral", "reliability": "Low", "description": "Not enough data"}

    curr_open = float(opn.iloc[-1])
    curr_close = float(close.iloc[-1])
    curr_high = float(high.iloc[-1])
    curr_low = float(low.iloc[-1])
    prev_open = float(opn.iloc[-2])
    prev_close = float(close.iloc[-2])

    curr_body = abs(curr_close - curr_open)
    curr_range = curr_high - curr_low
    prev_body = abs(prev_close - prev_open)

    # Bullish Engulfing
    if (prev_close < prev_open and  # previous was red
        curr_close > curr_open and  # current is green
        curr_open <= prev_close and  # opens at or below prev close
        curr_close >= prev_open):    # closes at or above prev open
        return {
            "latest": "Bullish Engulfing",
            "type": "bullish",
            "reliability": "High",
            "description": "A large green candle completely engulfs the previous red candle — signals strong buying pressure and potential reversal."
        }

    # Bearish Engulfing
    if (prev_close > prev_open and
        curr_close < curr_open and
        curr_open >= prev_close and
        curr_close <= prev_open):
        return {
            "latest": "Bearish Engulfing",
            "type": "bearish",
            "reliability": "High",
            "description": "A large red candle completely engulfs the previous green candle — signals strong selling pressure."
        }

    # Doji (very small body relative to range)
    if curr_range > 0 and curr_body / curr_range < 0.1:
        return {
            "latest": "Doji",
            "type": "neutral",
            "reliability": "Medium",
            "description": "Open and close are nearly equal — market indecision. Wait for confirmation before acting."
        }

    # Hammer (small body at top, long lower shadow)
    lower_shadow = min(curr_open, curr_close) - curr_low
    upper_shadow = curr_high - max(curr_open, curr_close)
    if curr_range > 0 and lower_shadow > 2 * curr_body and upper_shadow < curr_body * 0.3:
        return {
            "latest": "Hammer",
            "type": "bullish",
            "reliability": "Medium",
            "description": "Small body with long lower shadow — buyers pushed price back up. Potential bullish reversal signal."
        }

    # Shooting Star (small body at bottom, long upper shadow)
    if curr_range > 0 and upper_shadow > 2 * curr_body and lower_shadow < curr_body * 0.3:
        return {
            "latest": "Shooting Star",
            "type": "bearish",
            "reliability": "Medium",
            "description": "Small body with long upper shadow — sellers pushed price back down. Potential bearish reversal."
        }

    # Marubozu (full body, no/tiny shadows)
    if curr_range > 0 and curr_body / curr_range > 0.9:
        if curr_close > curr_open:
            return {
                "latest": "Bullish Marubozu",
                "type": "bullish",
                "reliability": "High",
                "description": "Full green body with no shadows — strong buying momentum throughout the session."
            }
        else:
            return {
                "latest": "Bearish Marubozu",
                "type": "bearish",
                "reliability": "High",
                "description": "Full red body with no shadows — strong selling pressure throughout the session."
            }

    # Default — regular candle
    if curr_close > curr_open:
        return {
            "latest": "Bullish Candle",
            "type": "bullish",
            "reliability": "Low",
            "description": "Regular green candle — price closed higher than it opened."
        }
    else:
        return {
            "latest": "Bearish Candle",
            "type": "bearish",
            "reliability": "Low",
            "description": "Regular red candle — price closed lower than it opened."
        }


def get_crossovers(df):
    """Detect SMA crossover signals"""
    close = df["Close"].squeeze()

    sma5 = ta.sma(close, length=5)
    sma20 = ta.sma(close, length=20)
    sma50 = ta.sma(close, length=50)
    sma200 = ta.sma(close, length=200)

    crossovers = {}

    # 5 & 20 SMA Crossover
    crossovers["shortTerm"] = detect_cross(sma5, sma20, "5 & 20 SMA")

    # 20 & 50 SMA Crossover
    crossovers["longTerm"] = detect_cross(sma20, sma50, "20 & 50 SMA")

    # 50 & 200 SMA (Golden/Death Cross)
    crossovers["golden"] = detect_cross(sma50, sma200, "50 & 200 SMA")

    return crossovers


def detect_cross(fast, slow, name):
    """Detect if fast SMA crossed above or below slow SMA, and how many days ago"""
    if fast is None or slow is None:
        return {"name": name, "status": "Unknown", "daysAgo": 0}

    # Drop NaN values and align
    combined = pd.DataFrame({"fast": fast, "slow": slow}).dropna()

    if len(combined) < 2:
        return {"name": name, "status": "Unknown", "daysAgo": 0}

    # Check current position
    currently_above = combined["fast"].iloc[-1] > combined["slow"].iloc[-1]

    # Find the last crossover
    diff = combined["fast"] - combined["slow"]
    cross_points = (diff.shift(1) * diff) < 0  # sign change

    if cross_points.any():
        last_cross_idx = cross_points[cross_points].index[-1]
        days_ago = len(combined) - combined.index.get_loc(last_cross_idx)
    else:
        days_ago = len(combined)

    return {
        "name": name,
        "status": "Bullish" if currently_above else "Bearish",
        "daysAgo": int(days_ago),
    }


def safe_last(series):
    """Safely get the last non-NaN value from a series"""
    if series is None:
        return 0
    try:
        s = series.dropna()
        if len(s) == 0:
            return 0
        return round(float(s.iloc[-1]), 2)
    except:
        return 0
