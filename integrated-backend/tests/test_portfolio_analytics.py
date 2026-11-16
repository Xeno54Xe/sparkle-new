"""Portfolio analytics: the statistics on known synthetic data, and the endpoint."""
import math

import numpy as np
import pandas as pd

import portfolio_analytics as pa


def test_percentile_scores_rank_and_keep_missing():
    out = pa.percentile_scores({"a": 1.0, "b": 3.0, "c": 2.0, "d": None})
    assert out == {"a": 0.0, "b": 100.0, "c": 50.0, "d": None}
    low = pa.percentile_scores({"a": 1.0, "b": 3.0, "c": 2.0}, higher_is_better=False)
    assert low["a"] == 100.0 and low["b"] == 0.0


def test_adf_tells_random_walk_from_mean_reverting_series():
    rng = np.random.default_rng(7)
    shocks = rng.normal(size=600)
    walk = np.cumsum(shocks)
    ar = np.zeros(600)
    for t in range(1, 600):
        ar[t] = 0.5 * ar[t - 1] + shocks[t]
    assert pa.eg_significance(pa.adf_tstat(walk - walk.mean())) is None
    assert pa.eg_significance(pa.adf_tstat(ar)) == "1%"


def test_engle_granger_finds_hedge_ratio_and_rejects_unrelated_walks():
    rng = np.random.default_rng(11)
    x = np.cumsum(rng.normal(size=500))
    noise = np.zeros(500)
    for t in range(1, 500):
        noise[t] = 0.6 * noise[t - 1] + rng.normal(scale=0.5)
    y = 1.0 + 2.0 * x + noise
    res = pa.engle_granger(y, x)
    assert abs(res["hedge_ratio"] - 2.0) < 0.05
    assert res["significance"] == "1%"

    other = np.cumsum(rng.normal(size=500))
    assert pa.engle_granger(other, x)["significance"] is None


def test_half_life_of_ar1():
    rng = np.random.default_rng(3)
    s = np.zeros(5000)
    for t in range(1, 5000):
        s[t] = 0.9 * s[t - 1] + rng.normal()
    # theoretical half-life for phi = 0.9 is ln(2) / -ln(0.9) ~= 6.6 days
    assert 5.5 < pa.half_life(s) < 7.8


def _market(days=300, seed=5):
    """Index plus three stocks: one tracks the index at beta 1.5, two form a cointegrated pair."""
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range(end="2026-11-13", periods=days)
    m = rng.normal(0.0004, 0.01, days)
    hi_beta = 1.5 * m + rng.normal(0, 0.004, days)
    base = rng.normal(0.0003, 0.012, days)
    walk = np.exp(np.cumsum(base))
    spread = np.zeros(days)
    for t in range(1, days):
        spread[t] = 0.7 * spread[t - 1] + rng.normal(0, 0.01)
    closes = pd.DataFrame({
        "^NSEI": 20000 * np.cumprod(1 + m),
        "HB.NS": 100 * np.cumprod(1 + hi_beta),
        "PA.NS": 50 * walk * np.exp(spread),
        "PB.NS": 80 * walk,
    }, index=idx)
    tickers = {"HB": "HB.NS", "PA": "PA.NS", "PB": "PB.NS"}
    sectors = {"HB": "Metals", "PA": "Banking", "PB": "Banking"}
    fundamentals = {
        "HB": {"market_cap": 3e12, "pe_ratio": 30, "pb_ratio": 5, "roe": 10, "debt_to_equity": 80},
        "PA": {"market_cap": 2e12, "pe_ratio": 12, "pb_ratio": 1.5, "roe": 15, "debt_to_equity": 0},
        "PB": {"market_cap": 1e12, "pe_ratio": -5, "pb_ratio": 2, "roe": 20, "debt_to_equity": 0},
    }
    return closes, fundamentals, tickers, sectors


def test_build_analytics_on_synthetic_market():
    closes, fundamentals, tickers, sectors = _market()
    out = pa.build_analytics(closes, fundamentals, tickers, sectors)

    assert out["days"] == pa.TRADING_DAYS
    assert len(out["dates"]) == len(out["benchmark_returns"]) == pa.TRADING_DAYS
    assert all(len(r) == pa.TRADING_DAYS for r in out["returns"].values())

    hb = out["stocks"]["HB"]
    assert abs(hb["beta"] - 1.5) < 0.1
    for stock in out["stocks"].values():
        for score in stock["factors"].values():
            assert score is None or 0 <= score <= 100

    # Loss-making PB has no earnings yield; value then rests on book yield alone.
    assert out["stocks"]["PB"]["pe"] == -5
    assert out["stocks"]["PB"]["factors"]["value"] is not None
    # Debt/equity is ignored for banks, so quality comes from ROE only.
    assert out["stocks"]["PA"]["debt_to_equity"] is None

    assert out["pairs_tested"] == 1  # only the two Banking stocks share a sector
    pair = out["pairs"][0]
    assert pair["pair"] == "PA/PB" and pair["sector"] == "Banking"
    assert pair["significance"] in ("1%", "5%")
    assert abs(pair["hedge_ratio"] - 1.0) < 0.1
    assert len(pair["points"]) == 120
    assert math.isfinite(pair["z"])


def test_endpoint_serves_analytics(client):
    r = client.get("/portfolio/analytics")
    assert r.status_code == 200
    body = r.json()
    assert not body.get("error")
    assert set(body["stocks"]) == set(pa_symbols())
    assert body["benchmark"]["name"] == "Nifty 50"
    assert body["pairs_tested"] > 0
    first = next(iter(body["stocks"].values()))
    assert set(first["factors"]) == {"momentum", "value", "size", "quality", "lowVolatility"}


def pa_symbols():
    import stocks
    return list(stocks.TICKERS)
