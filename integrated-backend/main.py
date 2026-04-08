import os
import json
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import urllib.request
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import services
from stock_service import get_stock_history, get_stock_price
from technical_service import get_indicators, get_candlestick_pattern, get_crossovers
from signal_service import generate_signal
from financial_service import (
    get_stock_info, 
    get_financials, 
    get_estimates, 
    get_fundamental_analysis  # Updated logic resides here
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SparkleAI Investment Backend", version="5.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory for the new outputs structure
EARNINGS_OUTPUTS = os.path.join(os.path.dirname(__file__), "outputs")

# Mount static files if needed for direct PDF/Image access
if os.path.exists(EARNINGS_OUTPUTS):
    app.mount("/data", StaticFiles(directory=EARNINGS_OUTPUTS), name="earnings-data")

@app.get("/")
def home():
    return {
        "status": "online",
        "version": "5.0",
        "message": "Integrated Backend Active",
        "structure": "Optimized Beginner JSON"
    }

# ═══ TECHNICAL ANALYSIS ═══

@app.get("/price/{ticker}")
def price(ticker: str):
    return get_stock_price(ticker)

@app.get("/technical/{ticker}")
def technical_analysis(ticker: str):
    df = get_stock_history(ticker)
    indicators = get_indicators(df)
    indicators["candle"] = get_candlestick_pattern(df)
    indicators["crossovers"] = get_crossovers(df)
    return indicators

@app.get("/signal/{ticker}")
def signal(ticker: str):
    df = get_stock_history(ticker)
    indicators = get_indicators(df)
    indicators["candle"] = get_candlestick_pattern(df)
    indicators["crossovers"] = get_crossovers(df)
    return generate_signal(indicators)

@app.get("/full/{ticker}")
def full_analysis(ticker: str):
    try:
        df = get_stock_history(ticker)
        ind = get_indicators(df)
        ind["candle"] = get_candlestick_pattern(df)
        ind["crossovers"] = get_crossovers(df)
        sig = generate_signal(ind)
        return {"indicators": ind, "signal": sig}
    except Exception as e:
        return {"error": str(e)}

# ═══ FUNDAMENTAL ANALYSIS (Research Data) ═══

@app.get("/fundamental/{company}")
def get_fundamental(company: str):
    """
    Primary endpoint for Sparkle Intelligence -> Fundamental Analysis Tab.
    This routes to financial_service.py which handles the EC/AR folder logic.
    """
    # company here should be the folder name (e.g., 'Adani Enterprises')
    data = get_fundamental_analysis(company)
    return data

@app.get("/companies")
def get_all_companies():
    """
    Lists all company folders present in the outputs directory.
    """
    try:
        if not os.path.exists(EARNINGS_OUTPUTS):
            return {"total": 0, "companies": []}
        
        folders = [f for f in os.listdir(EARNINGS_OUTPUTS) 
                   if os.path.isdir(os.path.join(EARNINGS_OUTPUTS, f))]
        
        result = []
        for folder in sorted(folders):
            result.append({
                "name": folder,
                "folder": folder
            })
        return {"total": len(result), "companies": result}
    except Exception as e:
        return {"error": str(e)}

# ═══ REAL-TIME FINANCIAL DATA (yfinance) ═══

@app.get("/stock-info/{ticker}")
def stock_info(ticker: str):
    return get_stock_info(ticker)

@app.get("/financials/{ticker}")
def financials(ticker: str):
    return get_financials(ticker)

@app.get("/estimates/{ticker}")
def estimates(ticker: str):
    return get_estimates(ticker)

@app.get("/stock-complete/{ticker}")
def stock_complete(ticker: str, company_name: str = None):
    """
    Returns a combined view of Technicals, Financials (yfinance), 
    and Fundamental (Research) data.
    """
    info = get_stock_info(ticker)
    
    # Technical Data
    try:
        df = get_stock_history(ticker)
        ind = get_indicators(df)
        ind["candle"] = get_candlestick_pattern(df)
        ind["crossovers"] = get_crossovers(df)
        technical = {"indicators": ind, "signal": generate_signal(ind)}
    except:
        technical = {"error": "Technical service unavailable"}

    # Fundamental Data (Research Files)
    fundamental = {"error": "Company name not provided for research data"}
    if company_name:
        fundamental = get_fundamental_analysis(company_name)

    return {
        "info": info,
        "technical": technical,
        "financials": get_financials(ticker),
        "estimates": get_estimates(ticker),
        "fundamental_research": fundamental
    }

# ═══ NEWS SERVICE ═══

def parse_time_ago(pub_date_str):
    try:
        dt = datetime.strptime(pub_date_str.strip(), "%a, %d %b %Y %H:%M:%S %Z")
        dt = dt.replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        mins = int(diff.total_seconds() / 60)
        if mins < 60: return f"{mins}m ago"
        hours = mins // 60
        if hours < 24: return f"{hours}h ago"
        return f"{hours // 24}d ago"
    except:
        return "recently"

def fetch_rss(query, category, count=2):
    try:
        full_query = f"{query} when:1d"
        url = f"https://news.google.com/rss/search?q={urllib.request.quote(full_query)}&hl=en-IN&gl=IN&ceid=IN:en"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        response = urllib.request.urlopen(req, timeout=8)
        root = ET.fromstring(response.read().decode("utf-8"))

        articles = []
        now = datetime.now(timezone.utc)
        for item in root.findall(".//item")[:count+3]: # Fetch slight overage to allow filtering
            title = item.findtext("title", "")
            pub_date = item.findtext("pubDate", "")
            
            # Date filtering
            dt = None
            try: dt = datetime.strptime(pub_date.strip(), "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
            except: pass
            
            if dt and (now - dt).total_seconds() / 3600 > 48: continue

            articles.append({
                "title": re.sub(r" - [^-]+$", "", title).strip(),
                "link": item.findtext("link", ""),
                "source": (re.search(r" - (.+)$", title).group(1) if " - " in title else "News"),
                "time": parse_time_ago(pub_date),
                "category": category,
                "_dt": dt
            })
            if len(articles) >= count: break
        return articles
    except:
        return []

@app.get("/news")
def get_news():
    categories = [
        ("Indian stock market Nifty Sensex today", "Market", 3),
        ("RBI SEBI corporate news India", "Policy", 2),
        ("quarterly results earnings India today", "Earnings", 3)
    ]
    all_articles = []
    seen = set()
    for query, cat, count in categories:
        for item in fetch_rss(query, cat, count):
            if item["title"] not in seen:
                seen.add(item["title"])
                all_articles.append(item)
    
    all_articles.sort(key=lambda x: x.get("_dt") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    for a in all_articles: a.pop("_dt", None)
    return {"articles": all_articles[:10]}