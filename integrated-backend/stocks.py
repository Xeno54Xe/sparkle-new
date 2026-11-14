"""The covered stock list, read from the file the frontend also uses.

frontend/lib/nifty50.json is the single source of truth. When the backend
is deployed on its own (e.g. on Vercel, without the frontend folder next to
it) the copy in this folder, nifty50.json, is used instead; a test keeps the
two identical. SPARKLE_STOCKS_FILE overrides both.
"""
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_FRONTEND_FILE = os.path.join(_HERE, "..", "frontend", "lib", "nifty50.json")
_BUNDLED_FILE = os.path.join(_HERE, "nifty50.json")

STOCKS_FILE = os.environ.get(
    "SPARKLE_STOCKS_FILE",
    _FRONTEND_FILE if os.path.exists(_FRONTEND_FILE) else _BUNDLED_FILE,
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
