import yfinance as yf
import pandas as pd

def get_stock_history(ticker, period="1y", interval="1d"):
    df = yf.download(ticker, period=period, interval=interval)

    # Flatten MultiIndex columns (yfinance returns MultiIndex)
    if hasattr(df.columns, 'levels'):
        df.columns = df.columns.get_level_values(0)

    return df

def get_stock_price(ticker):
    """Get current price info"""
    stock = yf.Ticker(ticker)
    try:
        info = stock.fast_info
        price = info.last_price
        prev_close = info.previous_close
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
