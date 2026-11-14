import json
import os

import stocks

FRONTEND_LIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "lib", "nifty50.json")
OUTPUTS = os.path.join(os.path.dirname(__file__), "..", "outputs")


def test_backend_reads_the_frontend_list():
    with open(FRONTEND_LIST, encoding="utf-8") as f:
        frontend = json.load(f)["stocks"]
    assert [s["symbol"] for s in frontend] == list(stocks.TICKERS)


def test_bundled_copy_matches_the_frontend_list():
    # The backend ships its own copy for standalone deploys; it must not drift.
    bundled = os.path.join(os.path.dirname(__file__), "..", "nifty50.json")
    with open(FRONTEND_LIST, encoding="utf-8") as f, open(bundled, encoding="utf-8") as g:
        assert json.load(g) == json.load(f), "run: cp frontend/lib/nifty50.json integrated-backend/"


def test_list_is_complete_and_unique():
    symbols = [s["symbol"] for s in stocks.STOCKS]
    assert len(symbols) == 50
    assert len(set(symbols)) == 50
    for s in stocks.STOCKS:
        assert s["name"] and s["sector"]
        assert s["yahoo"] == f"{s['symbol']}.NS"


def test_report_folders_exist():
    missing = [s["folder"] for s in stocks.STOCKS
               if s["folder"] and not os.path.isdir(os.path.join(OUTPUTS, s["folder"]))]
    assert missing == []


def test_duplicate_symbol_is_rejected(tmp_path):
    bad = tmp_path / "list.json"
    bad.write_text(json.dumps({"stocks": [{"symbol": "TCS"}, {"symbol": "TCS"}]}))
    try:
        stocks.load_stocks(str(bad))
    except ValueError:
        return
    raise AssertionError("duplicate symbol was accepted")
