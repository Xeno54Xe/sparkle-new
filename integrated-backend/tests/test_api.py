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
