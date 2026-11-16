"""Real portfolio analytics for the Nifty 50, from free Yahoo Finance data.

Everything here is computed from daily closing prices and published company
fundamentals; nothing is simulated.

- Factor scores (0-100) are cross-sectional percentile ranks across the 50:
    momentum      12-1 month return (last 12 months, skipping the latest month)
    value         earnings yield (1/PE) and book yield (1/PB)
    size          market capitalisation
    quality       return on equity, plus low debt/equity outside financials
    lowVolatility annualised volatility of daily returns, lower ranks higher
- Per stock: 1-year return, volatility, beta and Jensen's alpha against the
  Nifty 50 index.
- Daily returns for every stock and the index, so the browser can compute
  portfolio-level risk at whatever weights the user enters.
- Pairs: same-sector Engle-Granger cointegration tests on log prices, with the
  hedge ratio, ADF statistic, half-life and current z-score of the spread.

The functions below are pure (data in, data out) so they can be tested
without network access; main.py fetches the data and calls build_analytics.
"""
from __future__ import annotations

import math
from typing import Dict, Iterable, List, Optional

import numpy as np
import pandas as pd

TRADING_DAYS = 252
MONTH = 21
RISK_FREE = 0.065            # annual, used for alpha and Sharpe; shown in the UI
BENCHMARK = "^NSEI"
FINANCIAL_SECTORS = {"Banking", "Finance", "Insurance"}

# Engle-Granger critical values for the ADF test on residuals of a regression
# of one I(1) series on another with a constant (two variables, large sample;
# MacKinnon 2010). The statistic is compared against these.
EG_CRITICAL = (("1%", -3.90), ("5%", -3.34), ("10%", -3.04))


def _finite(x) -> Optional[float]:
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def percentile_scores(values: Dict[str, Optional[float]], higher_is_better: bool = True) -> Dict[str, Optional[float]]:
    """Rank each value against the others on a 0-100 scale; None stays None."""
    present = {k: v for k, v in values.items() if v is not None}
    out: Dict[str, Optional[float]] = {k: None for k in values}
    if len(present) < 2:
        for k in present:
            out[k] = 50.0
        return out
    series = pd.Series(present)
    ranks = series.rank(method="average", ascending=higher_is_better)
    scaled = (ranks - 1) / (len(series) - 1) * 100
    for k, v in scaled.items():
        out[k] = round(float(v), 1)
    return out


def _mean_of(*parts: Optional[float]) -> Optional[float]:
    vals = [p for p in parts if p is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _ols(y: np.ndarray, X: np.ndarray):
    """Least squares; returns coefficients, residuals and coefficient standard errors."""
    coef, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ coef
    dof = max(len(y) - X.shape[1], 1)
    sigma2 = float(np.sum(resid * resid)) / dof
    try:
        cov = sigma2 * np.linalg.inv(X.T @ X)
        se = np.sqrt(np.clip(np.diag(cov), 0, None))
    except np.linalg.LinAlgError:
        se = np.full(X.shape[1], np.nan)
    return coef, resid, se


def adf_tstat(series: Iterable[float], lags: int = 1) -> float:
    """Augmented Dickey-Fuller t-statistic (no constant: the input is a regression residual)."""
    e = np.asarray(list(series), dtype=float)
    de = np.diff(e)
    y = de[lags:]
    cols = [e[lags:-1]]
    for k in range(1, lags + 1):
        cols.append(de[lags - k:-k])
    X = np.column_stack(cols)
    coef, _, se = _ols(y, X)
    return float(coef[0] / se[0]) if se[0] > 0 else float("nan")


def eg_significance(tstat: float) -> Optional[str]:
    """Strictest Engle-Granger level the statistic passes, or None."""
    for level, crit in EG_CRITICAL:
        if tstat <= crit:
            return level
    return None


def half_life(spread: np.ndarray) -> Optional[float]:
    """Days for a deviation to halve, from an AR(1) fit of the spread."""
    s = np.asarray(spread, dtype=float)
    ds = np.diff(s)
    X = np.column_stack([np.ones(len(ds)), s[:-1]])
    coef, _, _ = _ols(ds, X)
    b = coef[1]
    if b >= 0:
        return None
    return round(float(-math.log(2) / b), 1)


def engle_granger(y: np.ndarray, x: np.ndarray) -> dict:
    """Regress y on x (with constant), then ADF-test the residual spread."""
    X = np.column_stack([np.ones(len(x)), x])
    coef, resid, _ = _ols(y, X)
    t = adf_tstat(resid, lags=1)
    return {"alpha": float(coef[0]), "hedge_ratio": float(coef[1]), "spread": resid, "adf_t": t,
            "significance": eg_significance(t)}


def _annualised_return(daily: pd.Series) -> float:
    growth = float((1 + daily).prod())
    years = len(daily) / TRADING_DAYS
    return growth ** (1 / years) - 1 if growth > 0 and years > 0 else float("nan")


def stock_stats(rets: pd.Series, bench: pd.Series) -> dict:
    """1-year return, volatility, beta and annualised Jensen's alpha vs the benchmark."""
    joined = pd.concat([rets, bench], axis=1, join="inner").dropna()
    r, m = joined.iloc[:, 0], joined.iloc[:, 1]
    vol = float(r.std(ddof=1) * math.sqrt(TRADING_DAYS))
    var_m = float(m.var(ddof=1))
    beta = float(r.cov(m) / var_m) if var_m > 0 else float("nan")
    rf_d = (1 + RISK_FREE) ** (1 / TRADING_DAYS) - 1
    alpha_d = float((r - rf_d).mean() - beta * (m - rf_d).mean())
    return {
        "ret_1y": _annualised_return(r),
        "vol": vol,
        "beta": beta,
        "alpha": (1 + alpha_d) ** TRADING_DAYS - 1,
    }


def build_pairs(log_prices: pd.DataFrame, rets: pd.DataFrame, sectors: Dict[str, str],
                limit: int = 8, chart_days: int = 120):
    """Test every same-sector pair for cointegration.

    Returns (best pairs, most negative ADF first; number of pairs tested).
    """
    symbols = [s for s in log_prices.columns if s in sectors]
    found = []
    for i, a in enumerate(symbols):
        for b in symbols[i + 1:]:
            if sectors[a] != sectors[b]:
                continue
            pair = log_prices[[a, b]].dropna()
            if len(pair) < 120:
                continue
            res = engle_granger(pair[a].to_numpy(), pair[b].to_numpy())
            if not math.isfinite(res["adf_t"]):
                continue
            spread = res["spread"]
            mean, sd = float(spread.mean()), float(spread.std(ddof=1))
            if sd <= 0:
                continue
            z = (spread - mean) / sd
            corr = _finite(rets[a].corr(rets[b]))
            found.append((res, a, b, z, pair.index, corr, spread))

    tested = len(found)
    found.sort(key=lambda item: item[0]["adf_t"])
    out = []
    for res, a, b, z, idx, corr, spread in found[:limit]:
        zl = float(z[-1])
        beta = res["hedge_ratio"]
        if res["significance"] is None:
            signal = "Not cointegrated at 10%; no trade"
        elif zl >= 2:
            signal = f"Spread high: short {a}, long {beta:.2f}x {b}"
        elif zl <= -2:
            signal = f"Spread low: long {a}, short {beta:.2f}x {b}"
        else:
            signal = "Spread within 2 sd of its mean; no trade"
        tail = slice(-chart_days, None)
        out.append({
            "pair": f"{a}/{b}",
            "left": a,
            "right": b,
            "sector": sectors[a],
            "hedge_ratio": round(beta, 3),
            "adf_t": round(res["adf_t"], 2),
            "significance": res["significance"],
            "half_life": half_life(spread),
            "correlation": round(corr, 2) if corr is not None else None,
            "z": round(zl, 2),
            "signal": signal,
            "points": [{"date": d.strftime("%Y-%m-%d"), "z": round(float(v), 3)}
                       for d, v in zip(idx[tail], z[tail])],
        })
    return out, tested


def build_analytics(closes: pd.DataFrame, fundamentals: Dict[str, dict], tickers: Dict[str, str],
                    sectors: Dict[str, str]) -> dict:
    """
    closes: daily closes, one column per Yahoo ticker (including BENCHMARK),
            at least ~13 months so 12-1 momentum has a full window.
    fundamentals: symbol -> {market_cap, pe_ratio, pb_ratio, roe, debt_to_equity}
    tickers: symbol -> Yahoo ticker; sectors: symbol -> sector.
    """
    if BENCHMARK not in closes.columns:
        raise ValueError("benchmark prices missing")
    by_symbol = closes.rename(columns={t: s for s, t in tickers.items()})
    symbols = [s for s in tickers if s in by_symbol.columns and by_symbol[s].notna().sum() > 60]
    prices = by_symbol[symbols + [BENCHMARK]].ffill()

    window = prices.iloc[-(TRADING_DAYS + 1):]
    rets = window.pct_change().iloc[1:]
    bench = rets[BENCHMARK]

    stats, momentum_raw = {}, {}
    for s in symbols:
        r = rets[s].dropna()
        if len(r) < 120:
            continue
        stats[s] = stock_stats(r, bench)
        p = prices[s].dropna()
        if len(p) > TRADING_DAYS:
            momentum_raw[s] = float(p.iloc[-MONTH - 1] / p.iloc[-TRADING_DAYS - 1] - 1)
        else:
            momentum_raw[s] = None

    def fund(s, key):
        v = _finite((fundamentals.get(s) or {}).get(key))
        return v if v not in (None, 0) else None

    ey = {s: (1 / fund(s, "pe_ratio")) if (fund(s, "pe_ratio") or 0) > 0 else None for s in stats}
    by = {s: (1 / fund(s, "pb_ratio")) if (fund(s, "pb_ratio") or 0) > 0 else None for s in stats}
    roe = {s: fund(s, "roe") for s in stats}
    de = {s: (fund(s, "debt_to_equity") if sectors.get(s) not in FINANCIAL_SECTORS else None) for s in stats}
    mcap = {s: fund(s, "market_cap") for s in stats}

    p_mom = percentile_scores({s: momentum_raw.get(s) for s in stats})
    p_ey, p_by = percentile_scores(ey), percentile_scores(by)
    p_size = percentile_scores(mcap)
    p_roe, p_de = percentile_scores(roe), percentile_scores(de, higher_is_better=False)
    p_lowvol = percentile_scores({s: _finite(stats[s]["vol"]) for s in stats}, higher_is_better=False)

    stocks = {}
    for s, st in stats.items():
        stocks[s] = {
            "sector": sectors.get(s),
            "ret_1y": round(st["ret_1y"], 4),
            "vol": round(st["vol"], 4),
            "beta": round(st["beta"], 3),
            "alpha": round(st["alpha"], 4),
            "momentum_12_1": round(momentum_raw[s], 4) if momentum_raw.get(s) is not None else None,
            "pe": fund(s, "pe_ratio"),
            "pb": fund(s, "pb_ratio"),
            "roe": roe[s],
            "debt_to_equity": de[s],
            "market_cap": mcap[s],
            "factors": {
                "momentum": p_mom[s],
                "value": _mean_of(p_ey[s], p_by[s]),
                "size": p_size[s],
                "quality": _mean_of(p_roe[s], p_de[s]),
                "lowVolatility": p_lowvol[s],
            },
        }

    bench_stats = {"ret_1y": round(_annualised_return(bench), 4),
                   "vol": round(float(bench.std(ddof=1) * math.sqrt(TRADING_DAYS)), 4)}

    log_prices = np.log(window[list(stats)])
    pairs, pairs_tested = build_pairs(log_prices, rets[list(stats)], sectors)

    return {
        "as_of": rets.index[-1].strftime("%Y-%m-%d"),
        "start": rets.index[0].strftime("%Y-%m-%d"),
        "days": len(rets),
        "risk_free": RISK_FREE,
        "benchmark": {"symbol": BENCHMARK, "name": "Nifty 50", **bench_stats},
        "dates": [d.strftime("%Y-%m-%d") for d in rets.index],
        "benchmark_returns": [round(float(v), 6) for v in bench.fillna(0)],
        "returns": {s: [round(float(v), 6) for v in rets[s].fillna(0)] for s in stats},
        "stocks": stocks,
        "pairs": pairs,
        "pairs_tested": pairs_tested,
        "methodology": {
            "momentum": "12-1 month price return, percentile rank across the Nifty 50",
            "value": "Average percentile of earnings yield (1/PE) and book yield (1/PB)",
            "size": "Percentile of market capitalisation",
            "quality": "Percentile of return on equity, averaged with low debt/equity outside financials",
            "lowVolatility": "Percentile of 1-year daily volatility, lower volatility ranks higher",
            "pairs": "Same-sector Engle-Granger test on 1 year of log prices; ADF(1) on the spread",
        },
    }
