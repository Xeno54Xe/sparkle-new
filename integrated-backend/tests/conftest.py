"""Shared test setup. Nothing here talks to Yahoo or Google News: the
download and feed functions are replaced with fixed fake data."""
import os
import sys

os.environ["SPARKLE_PRECOMPUTE"] = "0"  # no background thread in tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main


def fake_ohlcv(tickers, days):
    """A MultiIndex (field, ticker) frame like yf.download returns for several tickers."""
    idx = pd.bdate_range(end="2026-10-16", periods=days)
    cols, data = [], []
    for i, t in enumerate(tickers):
        base = 100 + 10 * i
        close = base + np.sin(np.arange(days) / 7 + i) * 5 + np.arange(days) * 0.05 * (1 if i % 2 else -1)
        for field, series in (
            ("Open", close - 0.5), ("High", close + 1), ("Low", close - 1),
            ("Close", close), ("Volume", np.full(days, 1e6 * (i + 1))),
        ):
            cols.append((field, t))
            data.append(series)
    frame = pd.DataFrame(np.array(data).T, index=idx, columns=pd.MultiIndex.from_tuples(cols))
    return frame.sort_index(axis=1)


def fake_history(ticker, period="1y", interval="1d"):
    if ticker.upper().startswith("NODATA"):
        raise main.NoDataError(f"No price history found for '{ticker}'")
    raw = fake_ohlcv([ticker], 250)
    raw.columns = raw.columns.get_level_values(0)
    return raw


@pytest.fixture
def calls():
    return {"download": 0, "history": 0, "rss": 0}


@pytest.fixture
def client(monkeypatch, calls):
    def download(tickers, period, ttl=60):
        calls["download"] += 1
        return fake_ohlcv(list(tickers), 250 if period == "1y" else 5)

    def history(ticker, period="1y", interval="1d"):
        calls["history"] += 1
        return fake_history(ticker, period, interval)

    def rss(query, category, count=2):
        calls["rss"] += 1
        return [{"title": f"{category}: {query} {n}", "link": "https://example.com", "source": "Test",
                 "time": "1 hr ago", "category": category, "_dt": None} for n in range(count)]

    monkeypatch.setattr(main, "yf_download_cached", download)
    monkeypatch.setattr(main, "get_stock_history", history)
    monkeypatch.setattr(main, "fetch_rss", rss)
    monkeypatch.setattr(main, "get_stock_price", lambda t: {"price": 101.0, "prev_close": 100.0, "change": 1.0, "change_pct": 1.0})

    # Fresh state for every test.
    for job in main.precomputer.jobs.values():
        job.value, job.updated_at, job.last_error, job.last_attempt = None, 0.0, None, 0.0
    main._hist_cache.clear()
    main._fund_cache.clear()

    with TestClient(main.app) as c:
        yield c
