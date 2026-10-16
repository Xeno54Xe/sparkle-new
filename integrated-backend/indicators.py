"""
Pure-pandas technical indicators.

Drop-in replacement for the subset of pandas_ta this backend used. pandas_ta's
0.3.x line was pulled from PyPI and 0.4.x requires Python >= 3.12, so the
backend could not be installed on most machines. These follow the same
conventions as pandas_ta (Wilder smoothing for RSI/ATR/ADX, population std for
Bollinger Bands, etc.).
"""
import numpy as np
import pandas as pd


def _rma(series, length):
    """Wilder's smoothing (a.k.a. RMA / SMMA)."""
    return series.ewm(alpha=1 / length, adjust=False, min_periods=length).mean()


def sma(close, length):
    return close.rolling(length, min_periods=length).mean()


def ema(close, length):
    return close.ewm(span=length, adjust=False, min_periods=length).mean()


def macd(close, fast=12, slow=26, signal=9):
    line = ema(close, fast) - ema(close, slow)
    sig = line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return pd.DataFrame({
        f"MACD_{fast}_{slow}_{signal}": line,
        f"MACDs_{fast}_{slow}_{signal}": sig,
        f"MACDh_{fast}_{slow}_{signal}": line - sig,
    })


def rsi(close, length=14):
    delta = close.diff()
    gain = _rma(delta.clip(lower=0), length)
    loss = _rma(-delta.clip(upper=0), length)
    rs = gain / loss.replace(0, np.nan)
    out = 100 - 100 / (1 + rs)
    # No losses in the window → RSI is 100
    return out.where(loss != 0, 100.0)


def true_range(high, low, close):
    prev_close = close.shift(1)
    return pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)


def atr(high, low, close, length=14):
    return _rma(true_range(high, low, close), length)


def adx(high, low, close, length=14):
    up = high.diff()
    down = -low.diff()
    plus_dm = up.where((up > down) & (up > 0), 0.0)
    minus_dm = down.where((down > up) & (down > 0), 0.0)
    atr_ = atr(high, low, close, length)
    plus_di = 100 * _rma(plus_dm, length) / atr_
    minus_di = 100 * _rma(minus_dm, length) / atr_
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return pd.DataFrame({
        f"ADX_{length}": _rma(dx, length),
        f"DMP_{length}": plus_di,
        f"DMN_{length}": minus_di,
    })


def roc(close, length=12):
    return 100 * (close / close.shift(length) - 1)


def stoch(high, low, close, k=14, d=3, smooth_k=3):
    lowest = low.rolling(k, min_periods=k).min()
    highest = high.rolling(k, min_periods=k).max()
    raw = 100 * (close - lowest) / (highest - lowest).replace(0, np.nan)
    stoch_k = raw.rolling(smooth_k, min_periods=smooth_k).mean()
    stoch_d = stoch_k.rolling(d, min_periods=d).mean()
    return pd.DataFrame({
        f"STOCHk_{k}_{d}_{smooth_k}": stoch_k,
        f"STOCHd_{k}_{d}_{smooth_k}": stoch_d,
    })


def cci(high, low, close, length=20):
    tp = (high + low + close) / 3
    mean = tp.rolling(length, min_periods=length).mean()
    mad = tp.rolling(length, min_periods=length).apply(
        lambda x: np.mean(np.abs(x - x.mean())), raw=True
    )
    return (tp - mean) / (0.015 * mad.replace(0, np.nan))


def willr(high, low, close, length=14):
    highest = high.rolling(length, min_periods=length).max()
    lowest = low.rolling(length, min_periods=length).min()
    return 100 * (close - highest) / (highest - lowest).replace(0, np.nan)


def mfi(high, low, close, volume, length=14):
    tp = (high + low + close) / 3
    raw_flow = tp * volume
    direction = tp.diff()
    pos = raw_flow.where(direction > 0, 0.0).rolling(length, min_periods=length).sum()
    neg = raw_flow.where(direction < 0, 0.0).rolling(length, min_periods=length).sum()
    ratio = pos / neg.replace(0, np.nan)
    out = 100 - 100 / (1 + ratio)
    return out.where(neg != 0, 100.0)


def bbands(close, length=20, std=2.0):
    mid = sma(close, length)
    dev = close.rolling(length, min_periods=length).std(ddof=0)
    return pd.DataFrame({
        f"BBL_{length}_{float(std)}": mid - std * dev,
        f"BBM_{length}_{float(std)}": mid,
        f"BBU_{length}_{float(std)}": mid + std * dev,
    })


def obv(close, volume):
    direction = np.sign(close.diff()).fillna(0)
    return (direction * volume).cumsum()


def rolling_vwap(high, low, close, volume, length=20):
    """VWAP over a rolling window (session VWAP is meaningless on daily bars)."""
    tp = (high + low + close) / 3
    return (tp * volume).rolling(length, min_periods=1).sum() / \
        volume.rolling(length, min_periods=1).sum().replace(0, np.nan)


def ichimoku_lines(high, low, tenkan=9, kijun=26):
    """Return (tenkan-sen, kijun-sen) midpoint lines."""
    t = (high.rolling(tenkan, min_periods=tenkan).max() + low.rolling(tenkan, min_periods=tenkan).min()) / 2
    k = (high.rolling(kijun, min_periods=kijun).max() + low.rolling(kijun, min_periods=kijun).min()) / 2
    return t, k
