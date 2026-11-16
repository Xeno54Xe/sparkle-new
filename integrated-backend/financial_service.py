import time
import yfinance as yf
import json


def _info_with_retry(ticker, attempts=2, pause=1.5):
    """Yahoo sometimes answers 401 / empty for a moment under load; one retry usually clears it."""
    last = None
    for i in range(attempts):
        started = time.time()
        try:
            info = yf.Ticker(ticker).info
            if info:
                return info
        except Exception as e:
            last = e
        # Only retry quick refusals; retrying a slow timeout would just double the wait.
        if i < attempts - 1 and time.time() - started < 5:
            time.sleep(pause)
        else:
            break
    raise last or ValueError(f"No data from Yahoo Finance for {ticker}")


def get_stock_info(ticker):
    """Get comprehensive stock info including key metrics"""
    try:
        info = _info_with_retry(ticker)
        return {
            "symbol": ticker,
            "name": info.get("longName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "price": {
                "current": info.get("currentPrice", info.get("regularMarketPrice", 0)),
                "previous_close": info.get("previousClose", 0),
                "open": info.get("open", 0),
                "day_high": info.get("dayHigh", 0),
                "day_low": info.get("dayLow", 0),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh", 0),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow", 0),
                "volume": info.get("volume", 0),
                "avg_volume": info.get("averageVolume", 0),
            },
            "metrics": {
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": round(info.get("trailingPE", 0) or 0, 2),
                "forward_pe": round(info.get("forwardPE", 0) or 0, 2),
                "pb_ratio": round(info.get("priceToBook", 0) or 0, 2),
                "eps": round(info.get("trailingEps", 0) or 0, 2),
                # yfinance >= 0.2.54 reports dividendYield already in percent
                "dividend_yield": round(info.get("dividendYield", 0) or 0, 2),
                "roe": round((info.get("returnOnEquity", 0) or 0) * 100, 2),
                "debt_to_equity": round(info.get("debtToEquity", 0) or 0, 2),
                "current_ratio": round(info.get("currentRatio", 0) or 0, 2),
                "beta": round(info.get("beta", 0) or 0, 2),
                "book_value": round(info.get("bookValue", 0) or 0, 2),
            },
        }
    except Exception as e:
        return {"error": str(e)}


def get_financials(ticker):
    """Get income statement, balance sheet, cash flow"""
    stock = yf.Ticker(ticker)
    result = {}

    try:
        # Income Statement
        fin = stock.financials
        if fin is not None and not fin.empty:
            income = {}
            for col in fin.columns[:4]:  # Last 4 years
                year = str(col.year) if hasattr(col, 'year') else str(col)
                income[year] = {}
                for idx in fin.index:
                    val = fin.loc[idx, col]
                    income[year][idx] = round(float(val), 2) if val == val else 0  # NaN check
            result["income_statement"] = income

        # Balance Sheet
        bs = stock.balance_sheet
        if bs is not None and not bs.empty:
            balance = {}
            for col in bs.columns[:4]:
                year = str(col.year) if hasattr(col, 'year') else str(col)
                balance[year] = {}
                for idx in bs.index:
                    val = bs.loc[idx, col]
                    balance[year][idx] = round(float(val), 2) if val == val else 0
            result["balance_sheet"] = balance

        # Cash Flow
        cf = stock.cashflow
        if cf is not None and not cf.empty:
            cashflow = {}
            for col in cf.columns[:4]:
                year = str(col.year) if hasattr(col, 'year') else str(col)
                cashflow[year] = {}
                for idx in cf.index:
                    val = cf.loc[idx, col]
                    cashflow[year][idx] = round(float(val), 2) if val == val else 0
            result["cash_flow"] = cashflow

    except Exception as e:
        result["error"] = str(e)

    return result


def get_estimates(ticker):
    """Get analyst recommendations and price targets"""
    stock = yf.Ticker(ticker)
    result = {}

    try:
        # Recommendations — yfinance now returns a monthly summary table
        # (period, strongBuy, buy, hold, sell, strongSell); "0m" is the latest.
        rec = stock.recommendations
        if rec is not None and not rec.empty and "strongBuy" in rec.columns:
            latest = rec.iloc[0]
            result["consensus"] = {
                "period": str(latest.get("period", "0m")),
                "strong_buy": int(latest.get("strongBuy", 0) or 0),
                "buy": int(latest.get("buy", 0) or 0),
                "hold": int(latest.get("hold", 0) or 0),
                "sell": int(latest.get("sell", 0) or 0),
                "strong_sell": int(latest.get("strongSell", 0) or 0),
            }

        # Price targets
        try:
            targets = stock.analyst_price_targets
            if targets is not None:
                result["price_targets"] = {
                    "low": targets.get("low", 0),
                    "current": targets.get("current", 0),
                    "mean": targets.get("mean", 0),
                    "median": targets.get("median", 0),
                    "high": targets.get("high", 0),
                }
        except Exception:
            pass

        # Earnings estimates
        try:
            earnings = stock.earnings_estimate
            if earnings is not None and not earnings.empty:
                result["earnings_estimate"] = earnings.to_dict()
        except Exception:
            pass

    except Exception as e:
        result["error"] = str(e)

    return result


def format_large_number(num):
    """Format number in Indian style (Cr, L)"""
    if num is None or num == 0:
        return "N/A"
    num = abs(num)
    if num >= 10000000:
        return f"₹{num / 10000000:,.2f} Cr"
    elif num >= 100000:
        return f"₹{num / 100000:,.2f} L"
    else:
        return f"₹{num:,.2f}"
