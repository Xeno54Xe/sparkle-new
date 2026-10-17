"""The covered stock list, read from the file the frontend also uses.

frontend/lib/nifty50.json is the single source of truth. Set
SPARKLE_STOCKS_FILE to point somewhere else (e.g. when the backend is
deployed without the frontend folder next to it).
"""
import json
import os

STOCKS_FILE = os.environ.get(
    "SPARKLE_STOCKS_FILE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "lib", "nifty50.json"),
)


def load_stocks(path: str = STOCKS_FILE) -> list:
    with open(path, encoding="utf-8") as f:
        stocks = json.load(f)["stocks"]
    symbols = [s["symbol"] for s in stocks]
    if len(set(symbols)) != len(symbols):
        raise ValueError(f"{path} lists a symbol twice")
    return stocks


STOCKS = load_stocks()

# Symbol → Yahoo ticker / display name / sector, in list order.
TICKERS = {s["symbol"]: s["yahoo"] for s in STOCKS}
NAMES = {s["symbol"]: s["name"] for s in STOCKS}
SECTORS = {s["symbol"]: s["sector"] for s in STOCKS}
BY_SYMBOL = {s["symbol"]: s for s in STOCKS}


def find_stock(symbol: str):
    """Look up a listed stock by NSE symbol, with or without '.NS', any case."""
    sym = symbol.strip().upper()
    if sym.endswith(".NS"):
        sym = sym[:-3]
    return BY_SYMBOL.get(sym)
