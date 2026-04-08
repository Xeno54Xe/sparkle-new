import os
import json
import logging
import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base directory for the new outputs structure
# Points to integrated-backend/outputs
BASE_OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")

def get_fundamental_analysis(stock_name: str):
    """
    Fetches fundamental analysis from the new beginner.json structure.
    New Structure: outputs/{stock_name}/{EC or AR}/{Year or Quarter}/beginner.json
    """
    try:
        # Path to the stock-specific folder
        stock_path = os.path.join(BASE_OUTPUTS_DIR, stock_name)
        
        if not os.path.exists(stock_path):
            logger.error(f"Directory not found for stock: {stock_name} at {stock_path}")
            return {"error": f"No data directory found for {stock_name}"}

        # Step 1: Check Earnings Call (EC) folder as primary source
        ec_path = os.path.join(stock_path, "EC")
        if os.path.exists(ec_path):
            # Sort to get the latest quarter (e.g., NOV25, JAN25)
            quarters = sorted(os.listdir(ec_path), reverse=True)
            for q in quarters:
                file_path = os.path.join(ec_path, q, "beginner.json")
                if os.path.exists(file_path):
                    logger.info(f"Loading latest EC data for {stock_name} from {q}")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return json.load(f)

        # Step 2: Fallback to Annual Report (AR) folder
        ar_path = os.path.join(stock_path, "AR")
        if os.path.exists(ar_path):
            # Sort to get the latest year (e.g., FY25)
            years = sorted(os.listdir(ar_path), reverse=True)
            for y in years:
                file_path = os.path.join(ar_path, y, "beginner.json")
                if os.path.exists(file_path):
                    logger.info(f"Loading latest AR data for {stock_name} from {y}")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return json.load(f)

        logger.warning(f"beginner.json not found in EC or AR for {stock_name}")
        return {"error": "Fundamental analysis file (beginner.json) not found"}

    except Exception as e:
        logger.error(f"Error reading fundamental analysis for {stock_name}: {str(e)}")
        return {"error": f"Internal server error: {str(e)}"}

def get_stock_info(ticker):
    """Get real-time comprehensive stock info from yfinance"""
    stock = yf.Ticker(ticker)
    try:
        info = stock.info
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
                "dividend_yield": round((info.get("dividendYield", 0) or 0) * 100, 2),
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
    """Get income statement, balance sheet, cash flow from yfinance"""
    stock = yf.Ticker(ticker)
    result = {}
    try:
        # Helper to process yfinance dataframes into JSON-serializable dicts
        def process_df(df):
            if df is not None and not df.empty:
                data = {}
                for col in df.columns[:4]:
                    year = str(col.year) if hasattr(col, 'year') else str(col)
                    data[year] = {idx: (round(float(val), 2) if val == val else 0) for idx, val in df[col].items()}
                return data
            return None

        result["income_statement"] = process_df(stock.financials)
        result["balance_sheet"] = process_df(stock.balance_sheet)
        result["cash_flow"] = process_df(stock.cashflow)
    except Exception as e:
        result["error"] = str(e)
    return result

def get_estimates(ticker):
    """Get analyst recommendations and price targets from yfinance"""
    stock = yf.Ticker(ticker)
    result = {}
    try:
        rec = stock.recommendations
        if rec is not None and not rec.empty:
            result["recommendations"] = [
                {"firm": row.get("Firm", "Unknown"), "grade": row.get("To Grade", ""), "action": row.get("Action", "")}
                for _, row in rec.tail(10).iterrows()
            ]

        targets = stock.analyst_price_targets
        if targets:
            result["price_targets"] = targets

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