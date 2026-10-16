import threading
import yfinance as yf
import pandas as pd

# yf.download is not safe to call concurrently (shared global state); every
# download in the backend goes through this lock.
YF_LOCK = threading.Lock()


class NoDataError(Exception):
    """Raised when Yahoo Finance returns no price history for a ticker."""


def get_stock_history(ticker, period="1y", interval="1d"):
    with YF_LOCK:
        df = yf.download(ticker, period=period, interval=interval, auto_adjust=True, progress=False, threads=False)

    # Flatten MultiIndex columns (yfinance returns MultiIndex)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.dropna(subset=["Close"]) if "Close" in df.columns else df
    if df.empty or len(df) < 2:
        raise NoDataError(f"No price history found for '{ticker}' (symbol may be delisted or renamed)")

    return df

def get_stock_price(ticker):
    """Get current price info"""
    stock = yf.Ticker(ticker)
    try:
        info = stock.fast_info
        price = info.last_price
        prev_close = info.previous_close
        if not price or not prev_close:
            return {"error": f"No price data for '{ticker}'"}
        change = price - prev_close
        change_pct = (change / prev_close) * 100
        return {
            "price": round(price, 2),
            "prev_close": round(prev_close, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
        }
    except Exception as e:
        return {"error": str(e)}
