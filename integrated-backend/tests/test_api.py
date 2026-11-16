import stocks


def test_home(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["companies"] > 0


def test_heatmap_covers_every_stock(client):
    body = client.get("/market/heatmap").json()
    assert body["count"] == 50
    assert {s["symbol"] for s in body["stocks"]} == set(stocks.TICKERS)
    keys = [(s["sector"], s["symbol"]) for s in body["stocks"]]
    assert keys == sorted(keys)
    first = body["stocks"][0]
    assert first["name"] == stocks.NAMES[first["symbol"]]
    assert set(first) == {"symbol", "name", "sector", "price", "change_pct"}


def test_market_endpoints_are_reused(client, calls):
    client.get("/market/heatmap")
    client.get("/market/heatmap")
    client.get("/market/heatmap")
    assert calls["download"] == 1


def test_indices(client):
    body = client.get("/market/indices").json()
    assert [i["name"] for i in body["indices"]] == ["NIFTY 50", "SENSEX", "BANK NIFTY"]
    for i in body["indices"]:
        assert i["is_positive"] == (i["change_pct"] >= 0)


def test_most_active_top_five(client):
    body = client.get("/market/most-active").json()
    assert [s["rank"] for s in body["stocks"]] == [1, 2, 3, 4, 5]
    assert all("volume" not in s and s["volume_fmt"] for s in body["stocks"])


def test_screener(client):
    first = client.get("/market/screener").json()
    assert first["count"] == 50 and first["cached"] is False
    scores = [s["overall_score"] for s in first["stocks"]]
    assert scores == sorted(scores, reverse=True)
    assert all(s["signal"] in {"BUY", "SELL", "HOLD", "STRONG BUY", "STRONG SELL"} for s in first["stocks"])
    again = client.get("/market/screener").json()
    assert again["cached"] is True and again["stocks"] == first["stocks"]


def test_failed_refresh_keeps_last_good_heatmap(client, monkeypatch):
    import main
    good = client.get("/market/heatmap").json()
    job = main.precomputer.jobs["heatmap"]
    job.updated_at -= 10_000                                  # make it stale
    monkeypatch.setattr(main, "yf_download_cached", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("Yahoo down")))
    assert client.get("/market/heatmap").json() == good


def test_news(client, calls):
    body = client.get("/news").json()
    assert 0 < body["count"] <= 8
    assert all("_dt" not in a for a in body["articles"])
    client.get("/news")
    assert calls["rss"] == 7                                  # one pass over the feeds


def test_precompute_status(client):
    client.get("/market/indices")
    jobs = client.get("/precompute/status").json()["jobs"]
    assert set(jobs) == {"indices", "heatmap", "most_active", "screener", "news"}
    assert jobs["indices"]["ready"] is True


def test_stock_page_calls_share_one_download(client, calls):
    for path in ("/full/TCS.NS", "/technical/TCS.NS", "/signal/TCS.NS"):
        assert client.get(path).status_code == 200
    assert calls["history"] == 1
    full = client.get("/full/TCS.NS").json()
    assert "RSI" in full["indicators"] and "signal" in full["signal"]


def test_history_rows(client):
    body = client.get("/history/TCS.NS?period=1mo").json()
    rows = body["rows"]
    assert rows[0]["date"] > rows[-1]["date"]                 # newest first
    assert rows[-1]["change_pct"] is None
    assert client.get("/history/TCS.NS?period=bogus").json()["period"] == "3mo"


def test_unknown_ticker_is_404(client):
    r = client.get("/full/NODATA.NS")
    assert r.status_code == 404 and "error" in r.json()


def test_price_is_cached(client, monkeypatch):
    import main
    n = {"calls": 0}

    def price(t):
        n["calls"] += 1
        return {"price": 1.0, "prev_close": 1.0, "change": 0.0, "change_pct": 0.0}

    monkeypatch.setattr(main, "get_stock_price", price)
    client.get("/price/TCS.NS")
    client.get("/price/tcs.ns")
    assert n["calls"] == 1


def test_price_errors_are_not_cached(client, monkeypatch):
    import main
    n = {"calls": 0}

    def price(t):
        n["calls"] += 1
        return {"error": "no data"}

    monkeypatch.setattr(main, "get_stock_price", price)
    client.get("/price/XYZ.NS")
    client.get("/price/XYZ.NS")
    assert n["calls"] == 2


def test_sparkle_report(client):
    listing = client.get("/sparkle/TCS/list").json()
    assert listing["reports"], "TCS should have a Sparkle Report"
    latest = client.get("/sparkle/TCS/latest").json()
    assert latest["pdf_url"].startswith("/data/TCS/SR/")
    assert client.get(latest["pdf_url"]).status_code == 200
    assert client.get("/sparkle/TCS/not-a-date").status_code == 400
    assert client.get("/sparkle/TCS/1999-01-01").status_code == 404
    assert client.get("/sparkle/NoSuchCompanyAnywhere/latest").status_code == 404


def test_fundamental_list_for_every_folder(client):
    for s in stocks.STOCKS:
        if s["folder"]:
            r = client.get(f"/fundamental/{s['folder']}/list")
            assert r.status_code == 200, s["folder"]


# ── stock news ──

def _news(articles, error=None):
    out = {"symbol": "TCS", "lookback_days": 7, "articles": articles,
           "mood": {"positive": 0, "negative": 0, "neutral": len(articles), "label": "Mixed"}}
    if error:
        out = {"symbol": "TCS", "articles": [], "error": error}
    return out


def test_stock_news_endpoint(client, monkeypatch):
    import main
    n = {"calls": 0}

    def fake(stock):
        n["calls"] += 1
        return _news([{"title": f"{stock['name']} news", "tone": "neutral"}])

    main._stock_news_cache.clear()
    monkeypatch.setattr(main.stock_news, "stock_news", fake)
    assert client.get("/news/stock/TCS").json()["articles"][0]["title"] == "Tata Consultancy Services news"
    client.get("/news/stock/tcs.ns")                           # same stock, from memory
    assert n["calls"] == 1
    assert client.get("/news/stock/NOPE").status_code == 404


def test_stock_news_keeps_last_good_result_when_feed_fails(client, monkeypatch):
    import main
    main._stock_news_cache.clear()
    monkeypatch.setattr(main.stock_news, "stock_news", lambda s: _news([{"title": "x", "tone": "neutral"}]))
    good = client.get("/news/stock/INFY").json()
    ts, val = main._stock_news_cache["INFY"]
    main._stock_news_cache["INFY"] = (ts - 10_000, val)        # expired
    monkeypatch.setattr(main.stock_news, "stock_news", lambda s: _news([], error="down"))
    assert client.get("/news/stock/INFY").json() == good
    main._stock_news_cache.clear()
    assert client.get("/news/stock/INFY").json()["error"] == "down"
    assert "INFY" not in main._stock_news_cache                # errors are not cached


# ── new-report badges ──

def _outputs(tmp_path, folders):
    """folders: {folder: {"SR": [...], "EC": [...], "AR": [...]}}"""
    for folder, cats in folders.items():
        for cat, periods in cats.items():
            for p in periods:
                d = tmp_path / folder / cat / p
                d.mkdir(parents=True)
                (d / ("sparkle.json" if cat == "SR" else "beginner.json")).write_text("{}")
    return tmp_path


def _fresh(monkeypatch, tmp_path, folders, today, registry=None):
    import json
    from datetime import date
    import main
    out = _outputs(tmp_path, folders)
    monkeypatch.setattr(main, "EARNINGS_OUTPUTS", str(out))
    reg = out / "registry.json"
    if registry is not None:
        reg.write_text(json.dumps(registry))
    monkeypatch.setattr(main, "REGISTRY_FILE", str(reg))
    return main.compute_fresh_reports(date.fromisoformat(today))["symbols"]


def test_fresh_sparkle_report_window(monkeypatch, tmp_path):
    folders = {"TCS": {"SR": ["2026-10-01", "2026-10-17"]}, "Infosys": {"SR": ["2026-09-01"]}}
    got = _fresh(monkeypatch, tmp_path, folders, "2026-10-18")
    assert got == {"TCS": [{"kind": "sparkle", "label": "Sparkle Report", "period": "2026-10-17"}]}
    assert _fresh(monkeypatch, tmp_path / "b", folders, "2026-11-01") == {}       # 15 days later


def test_fresh_earnings_call_by_filing_month(monkeypatch, tmp_path):
    folders = {"TCS": {"EC": ["AUG26", "OCT26"], "AR": ["FY26"]}, "Wipro": {"EC": ["SEP26"]}, "Infosys": {"EC": ["JUL26"]}}
    got = _fresh(monkeypatch, tmp_path, folders, "2026-10-18")
    assert got == {
        "TCS": [{"kind": "ec", "label": "Earnings call", "period": "OCT26"}],
        "WIPRO": [{"kind": "ec", "label": "Earnings call", "period": "SEP26"}],
    }
    # January: December of last year counts as last month
    assert "TCS" in _fresh(monkeypatch, tmp_path / "jan", {"TCS": {"EC": ["DEC26"]}}, "2027-01-05")


def test_fresh_uses_registry_when_present(monkeypatch, tmp_path):
    def entry(stock, kind, period, ts, status="success"):
        return {"stock": stock, "doc_type": kind, "period": period,
                "steps": {"beginner": {"status": status, "timestamp": ts}}}
    registry = {
        "a": entry("TCS", "ar", "FY26", "2026-10-10T08:00:00+00:00"),
        "b": entry("TCS", "ec", "OCT26", "2026-09-01T08:00:00+00:00"),      # finished long ago
        "c": entry("Infosys", "ec", "MAY26", "2026-10-16T08:00:00+00:00"),  # old call, newly analysed
        "d": entry("Wipro", "ar", "FY26", "2026-10-16T08:00:00+00:00", status="failed"),
    }
    folders = {"TCS": {"EC": ["OCT26"], "AR": ["FY26"]}, "Infosys": {"EC": ["MAY26"]}, "Wipro": {"AR": ["FY26"]}}
    got = _fresh(monkeypatch, tmp_path, folders, "2026-10-18", registry)
    assert got == {
        "TCS": [{"kind": "ar", "label": "Annual report", "period": "FY26"}],
        "INFY": [{"kind": "ec", "label": "Earnings call", "period": "MAY26"}],
    }


def test_fresh_ignores_bad_registry(monkeypatch, tmp_path):
    import main
    out = _outputs(tmp_path, {"TCS": {"EC": ["OCT26"]}})
    (out / "registry.json").write_text("{not json")
    monkeypatch.setattr(main, "EARNINGS_OUTPUTS", str(out))
    monkeypatch.setattr(main, "REGISTRY_FILE", str(out / "registry.json"))
    from datetime import date
    assert main.compute_fresh_reports(date(2026, 10, 18))["symbols"]["TCS"][0]["period"] == "OCT26"


def test_fresh_endpoint_on_real_outputs(client):
    import main
    main._fresh_cache.update(ts=0.0, day=None, value=None)
    body = client.get("/reports/fresh").json()
    assert set(body) == {"as_of", "rules", "symbols"}
    assert all(sym in stocks.TICKERS for sym in body["symbols"])
