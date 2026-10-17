from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from stock_service import get_stock_history, get_stock_price, NoDataError, YF_LOCK
from technical_service import get_indicators, get_candlestick_pattern, get_crossovers
from signal_service import generate_signal
from financial_service import get_stock_info, get_financials, get_estimates
from typing import Optional
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import yfinance as yf
import pandas as pd
from datetime import datetime, timezone

app = FastAPI(title="SparkleAI Investment Backend", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(NoDataError)
async def no_data_handler(_request: Request, exc: NoDataError):
    return JSONResponse(status_code=404, content={"error": str(exc)})


EARNINGS_OUTPUTS = os.path.join(os.path.dirname(__file__), "outputs")
if os.path.exists(EARNINGS_OUTPUTS):
    app.mount("/data", StaticFiles(directory=EARNINGS_OUTPUTS), name="earnings-data")


def find_company_folder(company: str) -> Optional[str]:
    """Find the exact outputs folder for a company by exact then case-insensitive match."""
    if not os.path.isdir(EARNINGS_OUTPUTS):
        return None
    needle = company.lower().replace("_", " ").strip()
    partial = None
    for entry in sorted(os.listdir(EARNINGS_OUTPUTS)):
        if not os.path.isdir(os.path.join(EARNINGS_OUTPUTS, entry)):
            continue
        entry_lower = entry.lower()
        if entry_lower == needle:
            return entry          # exact match wins immediately
        if partial is None and (needle in entry_lower or entry_lower in needle):
            partial = entry
    return partial


def clean_nans(obj):
    """Recursively replace NaN/Inf floats with None for JSON compliance."""
    if isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


# yfinance's multi-ticker download shares global state and is not safe to run
# concurrently; the dashboard fires several market calls at once. Serialise the
# downloads and cache each (tickers, period) result briefly.
_yf_lock = YF_LOCK
_yf_cache: dict = {}
YF_CACHE_TTL = 60  # seconds


def yf_download_cached(tickers, period: str, ttl: int = YF_CACHE_TTL):
    key = (tuple(tickers), period)
    now = time.time()
    hit = _yf_cache.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    with _yf_lock:
        hit = _yf_cache.get(key)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
        raw = yf.download(
            list(tickers),
            period=period,
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False,
        )
        if raw is not None and not raw.empty:
            _yf_cache[key] = (time.time(), raw)
        return raw


# ═══ HEATMAP DATA ═══

HEATMAP_TICKERS = {
    "RELIANCE": "RELIANCE.NS", "TCS": "TCS.NS", "HDFCBANK": "HDFCBANK.NS",
    "INFY": "INFY.NS", "ICICIBANK": "ICICIBANK.NS", "HINDUNILVR": "HINDUNILVR.NS",
    "ITC": "ITC.NS", "SBIN": "SBIN.NS", "BHARTIARTL": "BHARTIARTL.NS",
    "KOTAKBANK": "KOTAKBANK.NS", "LT": "LT.NS", "AXISBANK": "AXISBANK.NS",
    "MARUTI": "MARUTI.NS", "HCLTECH": "HCLTECH.NS", "SUNPHARMA": "SUNPHARMA.NS",
    "TITAN": "TITAN.NS", "BAJFINANCE": "BAJFINANCE.NS", "WIPRO": "WIPRO.NS",
    "ULTRACEMCO": "ULTRACEMCO.NS", "ONGC": "ONGC.NS", "NTPC": "NTPC.NS",
    "POWERGRID": "POWERGRID.NS", "M&M": "M&M.NS", "TMPV": "TMPV.NS",
    "JSWSTEEL": "JSWSTEEL.NS", "TATASTEEL": "TATASTEEL.NS", "ADANIENT": "ADANIENT.NS",
    "ADANIPORTS": "ADANIPORTS.NS", "COALINDIA": "COALINDIA.NS", "BPCL": "BPCL.NS",
    "GRASIM": "GRASIM.NS", "DRREDDY": "DRREDDY.NS", "CIPLA": "CIPLA.NS",
    "APOLLOHOSP": "APOLLOHOSP.NS", "EICHERMOT": "EICHERMOT.NS", "BAJAJFINSV": "BAJAJFINSV.NS",
    "BAJAJ-AUTO": "BAJAJ-AUTO.NS", "HEROMOTOCO": "HEROMOTOCO.NS", "TECHM": "TECHM.NS",
    "HINDALCO": "HINDALCO.NS", "INDUSINDBK": "INDUSINDBK.NS", "SBILIFE": "SBILIFE.NS",
    "HDFCLIFE": "HDFCLIFE.NS", "DIVISLAB": "DIVISLAB.NS", "BRITANNIA": "BRITANNIA.NS",
    "NESTLEIND": "NESTLEIND.NS", "TATACONSUM": "TATACONSUM.NS", "LTM": "LTM.NS",
    "ASIANPAINT": "ASIANPAINT.NS", "SHRIRAMFIN": "SHRIRAMFIN.NS",
}

HEATMAP_NAMES = {
    "RELIANCE": "Reliance Industries", "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank", "INFY": "Infosys", "ICICIBANK": "ICICI Bank",
    "HINDUNILVR": "Hindustan Unilever", "ITC": "ITC Limited", "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel", "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen & Toubro", "AXISBANK": "Axis Bank", "MARUTI": "Maruti Suzuki",
    "HCLTECH": "HCL Technologies", "SUNPHARMA": "Sun Pharmaceutical", "TITAN": "Titan Company",
    "BAJFINANCE": "Bajaj Finance", "WIPRO": "Wipro", "ULTRACEMCO": "UltraTech Cement",
    "ONGC": "Oil & Natural Gas Corp", "NTPC": "NTPC Limited", "POWERGRID": "Power Grid Corp",
    "M&M": "Mahindra & Mahindra", "TMPV": "Tata Motors Passenger Vehicles", "JSWSTEEL": "JSW Steel",
    "TATASTEEL": "Tata Steel", "ADANIENT": "Adani Enterprises", "ADANIPORTS": "Adani Ports",
    "COALINDIA": "Coal India", "BPCL": "Bharat Petroleum", "GRASIM": "Grasim Industries",
    "DRREDDY": "Dr. Reddy's Labs", "CIPLA": "Cipla", "APOLLOHOSP": "Apollo Hospitals",
    "EICHERMOT": "Eicher Motors", "BAJAJFINSV": "Bajaj Finserv", "BAJAJ-AUTO": "Bajaj Auto",
    "HEROMOTOCO": "Hero MotoCorp", "TECHM": "Tech Mahindra", "HINDALCO": "Hindalco Industries",
    "INDUSINDBK": "IndusInd Bank", "SBILIFE": "SBI Life Insurance",
    "HDFCLIFE": "HDFC Life Insurance", "DIVISLAB": "Divi's Laboratories",
    "BRITANNIA": "Britannia Industries", "NESTLEIND": "Nestle India",
    "TATACONSUM": "Tata Consumer Products", "LTM": "LTIMindtree",
    "ASIANPAINT": "Asian Paints", "SHRIRAMFIN": "Shriram Finance",
}

HEATMAP_SECTORS = {
    "RELIANCE": "Energy", "TCS": "IT", "HDFCBANK": "Banking", "INFY": "IT",
    "ICICIBANK": "Banking", "HINDUNILVR": "FMCG", "ITC": "FMCG", "SBIN": "Banking",
    "BHARTIARTL": "Telecom", "KOTAKBANK": "Banking", "LT": "Infrastructure",
    "AXISBANK": "Banking", "MARUTI": "Automobile", "HCLTECH": "IT",
    "SUNPHARMA": "Pharma", "TITAN": "Consumer Goods", "BAJFINANCE": "Finance",
    "WIPRO": "IT", "ULTRACEMCO": "Cement", "ONGC": "Energy", "NTPC": "Power",
    "POWERGRID": "Power", "M&M": "Automobile", "TMPV": "Automobile",
    "JSWSTEEL": "Metals", "TATASTEEL": "Metals", "ADANIENT": "Conglomerate",
    "ADANIPORTS": "Infrastructure", "COALINDIA": "Mining", "BPCL": "Energy",
    "GRASIM": "Cement", "DRREDDY": "Pharma", "CIPLA": "Pharma",
    "APOLLOHOSP": "Healthcare", "EICHERMOT": "Automobile", "BAJAJFINSV": "Finance",
    "BAJAJ-AUTO": "Automobile", "HEROMOTOCO": "Automobile", "TECHM": "IT",
    "HINDALCO": "Metals", "INDUSINDBK": "Banking", "SBILIFE": "Insurance",
    "HDFCLIFE": "Insurance", "DIVISLAB": "Pharma", "BRITANNIA": "FMCG",
    "NESTLEIND": "FMCG", "TATACONSUM": "FMCG", "LTM": "IT",
    "ASIANPAINT": "Consumer Goods", "SHRIRAMFIN": "Finance",
}


@app.get("/market/heatmap")
def get_market_heatmap():
    """Fetch live price changes for all Nifty 50 stocks in one batch yfinance call."""
    try:
        ticker_list = list(HEATMAP_TICKERS.values())
        raw = yf_download_cached(ticker_list, "5d")

        # yfinance returns MultiIndex (field, ticker) for multiple tickers
        if isinstance(raw.columns, pd.MultiIndex):
            close_df = raw["Close"].dropna(how="all")
        else:
            return clean_nans({"stocks": [], "error": "Unexpected data format"})

        result = []
        for symbol, yf_ticker in HEATMAP_TICKERS.items():
            try:
                if yf_ticker not in close_df.columns:
                    continue
                prices = close_df[yf_ticker].dropna()
                if len(prices) < 2:
                    continue
                prev = float(prices.iloc[-2])
                curr = float(prices.iloc[-1])
                if prev == 0:
                    continue
                change_pct = ((curr - prev) / prev) * 100
                result.append({
                    "symbol": symbol,
                    "name": HEATMAP_NAMES.get(symbol, symbol),
                    "sector": HEATMAP_SECTORS.get(symbol, "Other"),
                    "price": round(curr, 2),
                    "change_pct": round(change_pct, 2),
                })
            except Exception:
                continue

        # Sort by sector then symbol for consistent grouping
        result.sort(key=lambda x: (x["sector"], x["symbol"]))

        return clean_nans({
            "stocks": result,
            "timestamp": datetime.now().isoformat(),
            "count": len(result),
        })
    except Exception as e:
        return {"error": str(e), "stocks": [], "count": 0}


@app.get("/market/indices")
def get_market_indices():
    """Fetch live data for Nifty 50, Sensex, and Bank Nifty."""
    try:
        tickers = {
            "NIFTY 50":   "^NSEI",
            "SENSEX":     "^BSESN",
            "BANK NIFTY": "^NSEBANK",
        }
        raw = yf_download_cached(list(tickers.values()), "5d")
        if isinstance(raw.columns, pd.MultiIndex):
            close_df = raw["Close"].dropna(how="all")
        else:
            return {"error": "Unexpected format", "indices": []}

        result = []
        symbols = ["N", "S", "B"]
        for (name, yf_sym), sym in zip(tickers.items(), symbols):
            try:
                prices = close_df[yf_sym].dropna()
                if len(prices) < 2:
                    continue
                prev = float(prices.iloc[-2])
                curr = float(prices.iloc[-1])
                change_pct = ((curr - prev) / prev) * 100
                change_abs = curr - prev
                result.append({
                    "symbol": sym,
                    "name": name,
                    "value": round(curr, 2),
                    "change_pct": round(change_pct, 2),
                    "change_abs": round(change_abs, 2),
                    "is_positive": change_pct >= 0,
                })
            except Exception:
                continue

        return clean_nans({"indices": result, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return {"error": str(e), "indices": []}


@app.get("/market/most-active")
def get_most_active():
    """Fetch top 5 most actively traded Nifty 50 stocks by volume."""
    try:
        ticker_list = list(HEATMAP_TICKERS.values())
        raw = yf_download_cached(ticker_list, "5d")
        if not isinstance(raw.columns, pd.MultiIndex):
            return {"error": "Unexpected format", "stocks": []}

        close_df  = raw["Close"].dropna(how="all")
        volume_df = raw["Volume"].dropna(how="all")

        stocks = []
        for symbol, yf_ticker in HEATMAP_TICKERS.items():
            try:
                if yf_ticker not in close_df.columns or yf_ticker not in volume_df.columns:
                    continue
                prices  = close_df[yf_ticker].dropna()
                volumes = volume_df[yf_ticker].dropna()
                if len(prices) < 2 or len(volumes) < 1:
                    continue
                prev = float(prices.iloc[-2])
                curr = float(prices.iloc[-1])
                vol  = float(volumes.iloc[-1])
                if prev == 0:
                    continue
                change_pct = ((curr - prev) / prev) * 100
                stocks.append({
                    "symbol": symbol,
                    "name": HEATMAP_NAMES.get(symbol, symbol),
                    "price": round(curr, 2),
                    "change_pct": round(change_pct, 2),
                    "is_positive": change_pct >= 0,
                    "volume": vol,
                    "volume_fmt": f"{vol/1e7:.1f}Cr" if vol >= 1e7 else f"{vol/1e5:.1f}L",
                })
            except Exception:
                continue

        stocks.sort(key=lambda x: x["volume"], reverse=True)
        top5 = stocks[:5]
        for i, s in enumerate(top5, 1):
            s["rank"] = i
            del s["volume"]  # don't expose raw volume float

        return clean_nans({"stocks": top5, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return {"error": str(e), "stocks": []}


_screener_cache: dict = {"data": None, "ts": 0.0}
SCREENER_TTL = 300  # 5 minutes


@app.get("/market/screener")
def get_screener():
    """
    Compute live technical screener for all Nifty 50 stocks.
    Downloads 1 year of OHLCV in one batch, runs full indicator + signal
    pipeline per stock. Results are cached for 5 minutes.
    """
    now = time.time()
    if _screener_cache["data"] is not None and now - _screener_cache["ts"] < SCREENER_TTL:
        result = dict(_screener_cache["data"])
        result["cached"] = True
        result["cache_age_s"] = int(now - _screener_cache["ts"])
        return result

    try:
        ticker_list = list(HEATMAP_TICKERS.values())
        raw = yf_download_cached(ticker_list, "1y")

        if not isinstance(raw.columns, pd.MultiIndex):
            return {"error": "Unexpected data format", "stocks": [], "count": 0}

        stocks = []
        for symbol, yf_ticker in HEATMAP_TICKERS.items():
            try:
                df = pd.DataFrame({
                    "Open":   raw["Open"][yf_ticker],
                    "High":   raw["High"][yf_ticker],
                    "Low":    raw["Low"][yf_ticker],
                    "Close":  raw["Close"][yf_ticker],
                    "Volume": raw["Volume"][yf_ticker],
                }).dropna()

                if len(df) < 55:   # need ≥50 rows for SMA50
                    continue

                indicators = get_indicators(df)
                indicators["candle"] = get_candlestick_pattern(df)
                indicators["crossovers"] = get_crossovers(df)
                sig = generate_signal(indicators)

                curr = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                change_pct = ((curr - prev) / prev) * 100 if prev else 0

                sma50  = indicators.get("SMA50")  or 0
                sma200 = indicators.get("SMA200") or 0
                vs_sma50  = round(((curr - sma50)  / sma50)  * 100, 2) if sma50  else None
                vs_sma200 = round(((curr - sma200) / sma200) * 100, 2) if sma200 else None

                macd_bullish = (indicators.get("MACD") or 0) > (indicators.get("MACDSignal") or 0)

                stocks.append({
                    "symbol":        symbol,
                    "name":          HEATMAP_NAMES.get(symbol, symbol),
                    "sector":        HEATMAP_SECTORS.get(symbol, "Other"),
                    "price":         round(curr, 2),
                    "change_pct":    round(change_pct, 2),
                    "is_positive":   change_pct >= 0,
                    "signal":        sig["signal"],
                    "overall_score": sig["overall_score"],
                    "scores":        sig["scores"],
                    "counts":        sig["counts"],
                    "rsi":           indicators.get("RSI"),
                    "macd_bullish":  macd_bullish,
                    "adx":           indicators.get("ADX"),
                    "vs_sma50":      vs_sma50,
                    "vs_sma200":     vs_sma200,
                    "candle":        indicators.get("candle", {}).get("latest"),
                    "candle_type":   indicators.get("candle", {}).get("type"),
                    "volume_20d_avg": round(float(df["Volume"].tail(20).mean()), 0),
                })
            except Exception:
                continue

        stocks.sort(key=lambda x: x["overall_score"], reverse=True)

        result = clean_nans({
            "stocks":    stocks,
            "count":     len(stocks),
            "timestamp": datetime.now().isoformat(),
            "cached":    False,
            "cache_age_s": 0,
        })
        _screener_cache["data"] = result
        _screener_cache["ts"]   = now
        return result

    except Exception as e:
        return {"error": str(e), "stocks": [], "count": 0}


@app.get("/")
def home():
    companies = 0
    analyses = 0
    if os.path.isdir(EARNINGS_OUTPUTS):
        for company in os.listdir(EARNINGS_OUTPUTS):
            company_path = os.path.join(EARNINGS_OUTPUTS, company)
            if not os.path.isdir(company_path):
                continue
            companies += 1
            for cat in ("EC", "AR"):
                cat_path = os.path.join(company_path, cat)
                if os.path.isdir(cat_path):
                    analyses += sum(os.path.isdir(os.path.join(cat_path, p)) for p in os.listdir(cat_path))
    return {"message": "SparkleAI v4.0", "companies": companies, "total_analyses": analyses}


# ═══ TECHNICAL ═══

@app.get("/price/{ticker}")
def price(ticker: str):
    return clean_nans(get_stock_price(ticker))

HISTORY_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}


@app.get("/history/{ticker}")
def price_history(ticker: str, period: str = "3mo"):
    """Daily OHLCV rows, newest first."""
    if period not in HISTORY_PERIODS:
        period = "3mo"
    df = get_stock_history(ticker, period=period)
    rows = []
    prev_close = None
    for idx, r in df.iterrows():
        close = float(r["Close"])
        rows.append({
            "date": idx.strftime("%Y-%m-%d"),
            "open": round(float(r["Open"]), 2),
            "high": round(float(r["High"]), 2),
            "low": round(float(r["Low"]), 2),
            "close": round(close, 2),
            "volume": int(r["Volume"]) if r["Volume"] == r["Volume"] else 0,
            "change_pct": round((close - prev_close) / prev_close * 100, 2) if prev_close else None,
        })
        prev_close = close
    rows.reverse()
    return clean_nans({"symbol": ticker, "period": period, "rows": rows})


@app.get("/technical/{ticker}")
def technical_analysis(ticker: str):
    df = get_stock_history(ticker)
    indicators = get_indicators(df)
    indicators["candle"] = get_candlestick_pattern(df)
    indicators["crossovers"] = get_crossovers(df)
    return clean_nans(indicators)

@app.get("/signal/{ticker}")
def signal(ticker: str):
    df = get_stock_history(ticker)
    indicators = get_indicators(df)
    indicators["candle"] = get_candlestick_pattern(df)
    indicators["crossovers"] = get_crossovers(df)
    return clean_nans(generate_signal(indicators))

@app.get("/full/{ticker}")
def full_analysis(ticker: str):
    df = get_stock_history(ticker)
    indicators = get_indicators(df)
    indicators["candle"] = get_candlestick_pattern(df)
    indicators["crossovers"] = get_crossovers(df)
    sig = generate_signal(indicators)
    return clean_nans({"indicators": indicators, "signal": sig})


# ═══ FUNDAMENTAL (Earnings Call Data) ═══

@app.get("/fundamental/manifest")
def get_manifest():
    p = os.path.join(EARNINGS_OUTPUTS, "manifest.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Manifest not found"}

_MONTHS = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}


def _period_sort_key(period: str):
    """Chronological key for period folders like 'NOV25' (EC) or 'FY25' (AR)."""
    p = period.upper()
    m = re.fullmatch(r"([A-Z]{3})(\d{2})", p)
    if m and m.group(1) in _MONTHS:
        return (int(m.group(2)), _MONTHS[m.group(1)])
    m = re.fullmatch(r"FY(\d{2,4})", p)
    if m:
        return (int(m.group(1)[-2:]), 13)
    return (-1, 0)


@app.get("/fundamental/{company}/list")
def list_company_reports(company: str):
    """Return available Earnings Calls (EC) and Annual Reports (AR) for a company."""
    folder = find_company_folder(company)
    if not folder:
        return {"company": company, "earnings_calls": [], "annual_reports": []}

    def _periods(cat: str):
        path = os.path.join(EARNINGS_OUTPUTS, folder, cat)
        if not os.path.isdir(path):
            return []
        return sorted(
            [p for p in os.listdir(path) if os.path.isdir(os.path.join(path, p))],
            key=_period_sort_key,
            reverse=True,
        )

    return {
        "company": folder,
        "earnings_calls": [{"period": p, "label": p} for p in _periods("EC")],
        "annual_reports":  [{"period": p, "label": p} for p in _periods("AR")],
    }

@app.get("/fundamental/{company}/{category}/{period}")
def get_beginner_analysis(company: str, category: str, period: str):
    """Return beginner.json for outputs/{company}/{category}/{period}/.
    category must be EC or AR — guard against the old {quarter_fy} catch-all
    routing here by checking the value."""
    if category.upper() not in ("EC", "AR"):
        return {"error": f"Unknown category '{category}' (expected EC or AR)"}
    folder = find_company_folder(company)
    if not folder:
        return {"error": f"Company '{company}' not found"}
    cat = category.upper()
    fp = os.path.join(EARNINGS_OUTPUTS, folder, cat, period, "beginner.json")
    if not os.path.exists(fp):
        return {"error": f"No data for {company} / {category} / {period}"}
    with open(fp, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/fundamental/{company}")
def get_company_analyses(company: str):
    p = os.path.join(EARNINGS_OUTPUTS, "manifest.json")
    if not os.path.exists(p):
        return {"error": "Manifest not found"}
    with open(p, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    results = [e for e in manifest.get("analyses", []) if company.lower() in e.get("company", "").lower()]
    results.sort(key=lambda x: (x.get("fiscal_year") or "", x.get("quarter") or ""), reverse=True)
    return {"company": company, "total": len(results), "analyses": results}

def _legacy_quarter_analysis(company: str, quarter_fy: str):
    """Shared logic for the old quarter-based analysis lookup."""
    company_folder = company.replace(" ", "_")
    output_dir = os.path.join(EARNINGS_OUTPUTS, company_folder, quarter_fy)
    if not os.path.exists(output_dir):
        output_dir = os.path.join(EARNINGS_OUTPUTS, company, quarter_fy)
    if not os.path.exists(output_dir):
        return {"error": f"No analysis found for {company} {quarter_fy}"}
    result = {}
    files = {"esg": "esg_analysis.json", "sentiment": "sentiment_analysis.json",
             "speaker": "speaker_analysis.json", "summary": "summary_analysis.json",
             "metrics": "metrics.json"}
    for key, filename in files.items():
        filepath = os.path.join(output_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                result[key] = json.load(f)
    report_path = os.path.join(output_dir, "summary_report.md")
    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            result["report_markdown"] = f.read()
    manifest_path = os.path.join(EARNINGS_OUTPUTS, "manifest.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        for entry in manifest.get("analyses", []):
            ef = entry.get("company", "").replace(" ", "_")
            eq = (entry.get("quarter") or "") + "_" + (entry.get("fiscal_year") or "")
            if ef == company_folder and eq == quarter_fy:
                result["headline"] = entry.get("headline", {})
                result["quarter"] = entry.get("quarter")
                result["fiscal_year"] = entry.get("fiscal_year")
                break
    return result

@app.get("/fundamental/{company}/{quarter_fy}")
def get_quarter_analysis(company: str, quarter_fy: str):
    return _legacy_quarter_analysis(company, quarter_fy)


# ═══ SPARKLE REPORTS (fortnightly, generated by sparkle_backend_sr --sparkle) ═══
# outputs/{Company}/SR/{YYYY-MM-DD}/sparkle.json

_SR_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _sparkle_dir(company: str):
    folder = find_company_folder(company)
    if not folder:
        return None, None
    return folder, os.path.join(EARNINGS_OUTPUTS, folder, "SR")


def _read_sparkle(sr_dir: str, date: str):
    fp = os.path.join(sr_dir, date, "sparkle.json")
    if not os.path.exists(fp):
        return None
    with open(fp, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/sparkle/{company}/list")
def list_sparkle_reports(company: str):
    """Every Sparkle Report for a company, newest first, with headline and section scores for trends."""
    folder, sr_dir = _sparkle_dir(company)
    if not folder or not os.path.isdir(sr_dir):
        return {"company": folder or company, "reports": []}
    reports = []
    for date in sorted((d for d in os.listdir(sr_dir) if _SR_DATE.match(d)), reverse=True):
        data = _read_sparkle(sr_dir, date)
        if not data:
            continue
        reports.append({
            "date": date,
            "headline": (data.get("summary") or {}).get("headline"),
            "scores": data.get("scores") or {},
            "has_pdf": os.path.exists(os.path.join(sr_dir, date, "report.pdf")),
        })
    return clean_nans({"company": folder, "reports": reports})


@app.get("/sparkle/{company}/{date}")
def get_sparkle_report(company: str, date: str):
    """One Sparkle Report by date, or the newest with date=latest."""
    folder, sr_dir = _sparkle_dir(company)
    if not folder or not os.path.isdir(sr_dir):
        return JSONResponse(status_code=404, content={"error": f"No Sparkle Reports for '{company}' yet"})
    if date == "latest":
        dates = sorted((d for d in os.listdir(sr_dir) if _SR_DATE.match(d)), reverse=True)
        if not dates:
            return JSONResponse(status_code=404, content={"error": f"No Sparkle Reports for '{company}' yet"})
        date = dates[0]
    if not _SR_DATE.match(date):
        return JSONResponse(status_code=400, content={"error": "Date must look like YYYY-MM-DD or 'latest'"})
    data = _read_sparkle(sr_dir, date)
    if data is None:
        return JSONResponse(status_code=404, content={"error": f"No Sparkle Report for '{company}' on {date}"})
    data["pdf_url"] = (f"/data/{urllib.parse.quote(folder)}/SR/{date}/report.pdf"
                       if os.path.exists(os.path.join(sr_dir, date, "report.pdf")) else None)
    return clean_nans(data)


# ═══ REPORTS LIST ═══

@app.get("/reports/list")
def list_reports():
    """Recursively scan outputs/ for report.pdf files and return metadata + URL."""
    reports = []
    if not os.path.isdir(EARNINGS_OUTPUTS):
        return {"total": 0, "reports": []}
    for company in sorted(os.listdir(EARNINGS_OUTPUTS)):
        company_path = os.path.join(EARNINGS_OUTPUTS, company)
        if not os.path.isdir(company_path):
            continue
        for category in ("EC", "AR"):
            cat_path = os.path.join(company_path, category)
            if not os.path.isdir(cat_path):
                continue
            for period in sorted(os.listdir(cat_path)):
                period_path = os.path.join(cat_path, period)
                if not os.path.isdir(period_path):
                    continue
                if os.path.exists(os.path.join(period_path, "report.pdf")):
                    pdf_url = f"/data/{urllib.parse.quote(company)}/{category}/{urllib.parse.quote(period)}/report.pdf"
                    reports.append({
                        "company_name": company,
                        "category": category,
                        "period": period,
                        "pdf_url": pdf_url,
                    })
    return {"total": len(reports), "reports": reports}


# ═══ NEW: METRICS ENDPOINTS ═══

@app.get("/metrics/{company}")
def get_company_metrics(company: str):
    p = os.path.join(EARNINGS_OUTPUTS, "all_metrics.json")
    if not os.path.exists(p):
        return {"error": "all_metrics.json not found"}
    with open(p, "r", encoding="utf-8") as f:
        all_data = json.load(f)
    results = [e for e in all_data if company.lower() in e.get("company", "").lower()]
    results.sort(key=lambda x: (x.get("fiscal_year") or "", x.get("quarter") or ""), reverse=True)
    return {"company": company, "total": len(results), "quarters": results}

@app.get("/metrics/{company}/{quarter_fy}")
def get_quarter_metrics(company: str, quarter_fy: str):
    cf = company.replace(" ", "_")
    p = os.path.join(EARNINGS_OUTPUTS, cf, quarter_fy, "metrics.json")
    if not os.path.exists(p):
        p = os.path.join(EARNINGS_OUTPUTS, company, quarter_fy, "metrics.json")
    if not os.path.exists(p):
        return {"error": f"No metrics for {company} {quarter_fy}"}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/all-metrics")
def get_all_metrics():
    p = os.path.join(EARNINGS_OUTPUTS, "all_metrics.json")
    if not os.path.exists(p):
        return {"error": "all_metrics.json not found"}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/companies")
def get_all_companies():
    p = os.path.join(EARNINGS_OUTPUTS, "manifest.json")
    if not os.path.exists(p):
        return {"error": "Manifest not found"}
    with open(p, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    companies = {}
    for entry in manifest.get("analyses", []):
        name = entry.get("company", "")
        if name not in companies:
            companies[name] = {"name": name, "folder": name.replace(" ", "_"), "quarters": [], "latest_headline": None}
        qfy = f"{entry.get('quarter') or ''}_{entry.get('fiscal_year') or ''}"
        companies[name]["quarters"].append(qfy)
        if companies[name]["latest_headline"] is None:
            companies[name]["latest_headline"] = entry.get("headline", {})
    result = sorted(companies.values(), key=lambda x: x["name"])
    return {"total": len(result), "companies": result}


# ═══ FINANCIAL DATA (yfinance) ═══

# Company fundamentals change at most daily but each Yahoo call takes seconds,
# so keep results for a while. Errors are not cached.
_fund_cache: dict = {}
FUND_CACHE_TTL = 600


def _cached(kind: str, ticker: str, fn):
    key = (kind, ticker.upper())
    hit = _fund_cache.get(key)
    if hit and time.time() - hit[0] < FUND_CACHE_TTL:
        return hit[1]
    value = clean_nans(fn(ticker))
    if isinstance(value, dict) and not value.get("error"):
        _fund_cache[key] = (time.time(), value)
    return value


@app.get("/stock-info/{ticker}")
def stock_info(ticker: str):
    return _cached("info", ticker, get_stock_info)

@app.get("/financials/{ticker}")
def financials(ticker: str):
    return _cached("financials", ticker, get_financials)

@app.get("/estimates/{ticker}")
def estimates(ticker: str):
    return _cached("estimates", ticker, get_estimates)

@app.get("/stock-complete/{ticker}")
def stock_complete(ticker: str):
    info = get_stock_info(ticker)
    try:
        df = get_stock_history(ticker)
        ind = get_indicators(df)
        ind["candle"] = get_candlestick_pattern(df)
        ind["crossovers"] = get_crossovers(df)
        technical = {"indicators": ind, "signal": generate_signal(ind)}
    except Exception as e:
        technical = {"error": str(e)}
    try:
        fin = get_financials(ticker)
    except Exception as e:
        fin = {"error": str(e)}
    try:
        est = get_estimates(ticker)
    except Exception as e:
        est = {"error": str(e)}
    return clean_nans({"info": info, "technical": technical, "financials": fin, "estimates": est})


# ═══ NEWS ENDPOINT (Google News RSS — category-based) ═══

def parse_time_ago(pub_date_str):
    try:
        dt = datetime.strptime(pub_date_str.strip(), "%a, %d %b %Y %H:%M:%S %Z")
        dt = dt.replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        mins = int(diff.total_seconds() / 60)
        if mins < 60:
            return f"{mins} min ago"
        hours = mins // 60
        if hours < 24:
            return f"{hours} hr ago"
        days = hours // 24
        return f"{days}d ago"
    except Exception:
        return "recently"

def parse_pub_date(pub_date_str):
    """Returns datetime object or None"""
    try:
        dt = datetime.strptime(pub_date_str.strip(), "%a, %d %b %Y %H:%M:%S %Z")
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None

def fetch_rss(query, category, count=2):
    try:
        # Add 'when:1d' to force results from last 24 hours
        full_query = f"{query} when:1d"
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(full_query)}&hl=en-IN&gl=IN&ceid=IN:en"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        response = urllib.request.urlopen(req, timeout=8)
        xml_data = response.read().decode("utf-8")
        root = ET.fromstring(xml_data)

        articles = []
        seen_titles = set()
        now = datetime.now(timezone.utc)

        for item in root.findall(".//item"):
            if len(articles) >= count:
                break
            title = item.findtext("title", "")
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate", "")
            source_match = re.search(r" - (.+)$", title)
            source = source_match.group(1) if source_match else "Google News"
            clean_title = re.sub(r" - [^-]+$", "", title).strip()

            # Skip old articles (older than 48 hours)
            dt = parse_pub_date(pub_date)
            if dt:
                age_hours = (now - dt).total_seconds() / 3600
                if age_hours > 48:
                    continue

            # Skip duplicates
            title_key = clean_title[:50].lower()
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)

            articles.append({
                "title": clean_title,
                "link": link,
                "source": source,
                "time": parse_time_ago(pub_date),
                "category": category,
                "_dt": dt,
            })
        return articles
    except Exception:
        return []

@app.get("/news")
def get_news():
    try:
        categories = [
            ("stock market India today Nifty Sensex", "Market", 2),
            ("RBI SEBI policy regulation India today", "Policy", 1),
            ("India company quarterly results earnings today", "Earnings", 1),
            ("IT banking pharma auto sector stocks India today", "Sector", 1),
            ("crude oil gold commodity price India today", "Commodities", 1),
            ("FII DII buying selling India stocks today", "Market", 1),
            ("IPO listing India stock exchange today", "Market", 1),
        ]

        all_articles = []
        seen = set()
        for query, category, count in categories:
            items = fetch_rss(query, category, count)
            for item in items:
                key = item["title"][:50].lower()
                if key not in seen:
                    seen.add(key)
                    all_articles.append(item)

        # Sort by most recent first
        all_articles.sort(key=lambda x: x.get("_dt") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

        # Remove internal _dt field before returning
        for a in all_articles:
            a.pop("_dt", None)

        return {"articles": all_articles[:8], "count": len(all_articles[:8])}
    except Exception as e:
        return {"articles": [], "error": str(e)}
