"""Company headlines from Google News, with a rough tone per headline.

Headlines are kept only when they name the company (same alias rules as the
Sparkle Report generator in sparkle_backend_sr/src/sparkle/universe.py), so
news about a different "Reliance" or "Titan" is dropped.

Tone is estimated from finance words in the headline ("surges", "beats",
"downgrade", "probe"...). It is a quick hint, not FinBERT: the fortnightly
Sparkle Report scores news properly.
"""
from __future__ import annotations

import email.utils
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

LOOKBACK_DAYS = 7
MAX_ARTICLES = 8

# Extra names headlines use, by company folder/name. Copied from the generator
# for the pilot companies, plus common short names for the rest.
EXTRA_ALIASES: Dict[str, List[str]] = {
    "Reliance Industries": ["RIL", "Reliance"],
    "Bharti Airtel": ["Airtel"],
    "TCS": ["TCS", "Tata Consultancy"],
    "State Bank of India": ["SBI", "State Bank"],
    "Larsen & Toubro": ["L&T", "Larsen"],
    "Infosys": ["Infy"],
    "Kotak Mahindra Bank": ["Kotak Bank", "Kotak Mahindra"],
    "Hindustan Unilever": ["HUL"],
    "Sun Pharmaceutical Industries": ["Sun Pharma"],
    "Adani Ports & Special Economic Zone": ["Adani Ports", "APSEZ"],
    "Titan Company": ["Tanishq"],
    "Bajaj Finance": ["Bajaj Fin"],
    # not in the generator's pilot
    "Maruti Suzuki India": ["Maruti"],
    "HCL Technologies": ["HCL Tech", "HCLTech"],
    "UltraTech Cement": ["UltraTech"],
    "Power Grid Corporation of India": ["Power Grid"],
    "Tata Motors Passenger Vehicles": ["Tata Motors"],
    "Dr Reddys Laboratories": ["Dr Reddy's", "Dr. Reddy's", "Dr Reddy"],
    "Eicher Motors": ["Eicher", "Royal Enfield"],
    "IndusInd Bank": ["IndusInd"],
    "SBI Life Insurance Company": ["SBI Life"],
    "HDFC Life Insurance Company": ["HDFC Life"],
    "Divi's Laboratories": ["Divi's Labs", "Divis Labs"],
    "Nestle India": ["Nestle"],
    "Tata Consumer Products": ["Tata Consumer"],
    "Adani Enterprises": ["Adani Ent"],
    "Hindalco": ["Hindalco"],
    "ITC": ["ITC"],
    "NTPC": ["NTPC"],
    "ONGC": ["ONGC"],
    "BPCL": ["BPCL", "Bharat Petroleum"],
    "Grasim Industries": ["Grasim"],
}

# Headlines naming these are about a different company.
EXCLUDE: Dict[str, List[str]] = {
    "Reliance Industries": ["Reliance Power", "Reliance Infra", "Reliance Capital", "Reliance Communications",
                            "Reliance Home Finance", "Reliance General", "Reliance Nippon", "Anil Ambani"],
    "Titan Company": ["EcoFlow", "Titan Submersible", "Titan International", "TITAN Business Awards"],
    "Nestle India": ["Nestle SA", "Nestlé SA"],
    "Larsen & Toubro": ["L&T Finance", "L&T Technology", "L&T Tech", "LTTS", "LTIMindtree"],
}

# Names that are everyday words: use only these.
ALIASES_OVERRIDE: Dict[str, List[str]] = {
    "Titan Company": ["Titan Company", "TITAN.NS", "NSE:TITAN", "Tanishq", "Titan shares", "Titan stock",
                      "Titan share price", "Titan Q1", "Titan Q2", "Titan Q3", "Titan Q4"],
}


def aliases_for(stock: dict) -> List[str]:
    key = stock.get("folder") or stock["name"]
    if key in ALIASES_OVERRIDE:
        return list(ALIASES_OVERRIDE[key])
    out: List[str] = []
    for a in [stock["name"], stock.get("folder"), stock["symbol"]] + EXTRA_ALIASES.get(key, []):
        # Bare symbols like BAJAJ-AUTO or M&M never appear that way in headlines but are harmless.
        if a and a not in out:
            out.append(a)
    return out


def excludes_for(stock: dict) -> List[str]:
    return EXCLUDE.get(stock.get("folder") or stock["name"], [])


def news_query(stock: dict) -> str:
    key = stock.get("folder") or stock["name"]
    names = [stock["name"]] + [a for a in EXTRA_ALIASES.get(key, []) if a.lower() != stock["name"].lower()][:2]
    return " OR ".join(f'"{a}"' for a in names)


def mentions(text: str, name: str) -> bool:
    # ALL-CAPS short names (TCS, RIL, SBI) must match in capitals; others ignore case.
    flags = 0 if name.isupper() else re.I
    return re.search(rf"(?<![A-Za-z0-9]){re.escape(name)}(?![A-Za-z0-9])", text, flags) is not None


# ── tone ─────────────────────────────────────────────────────────────────────

_POSITIVE = [
    r"surg\w*", r"soar\w*", r"jump\w*", r"rall(y|ies|ied)", r"gain(s|ed)?", r"ris(e|es|ing)", r"rose",
    r"climb\w*", r"beat(s)?", r"record (profit|revenue|sales|high)", r"all[- ]time high", r"52[- ]week high",
    r"strong", r"robust", r"upgrad\w*", r"outperform\w*", r"bullish", r"upbeat", r"boost\w*",
    r"wins?", r"bags?", r"secur(es|ed)", r"approv\w*", r"clears?", r"expan(d|ds|ded|sion)", r"buyback",
    r"dividend", r"bonus", r"profit (up|rises|jumps|grows)", r"growth", r"grow(s|ing)?", r"top gainer", r"rebound\w*",
]
_NEGATIVE = [
    r"fall(s|en|ing)?", r"fell", r"drop\w*", r"slump\w*", r"plung\w*", r"tumbl\w*", r"declin\w*",
    r"slid(e|es)?", r"sink\w*", r"crash\w*", r"loss(es)?", r"miss(es|ed)?", r"weak\w*", r"downgrad\w*",
    r"underperform\w*", r"bearish", r"cut(s)?", r"probe", r"penalt\w*", r"fined?", r"raid\w*",
    r"lawsuit", r"default\w*", r"fraud", r"resign\w*", r"52[- ]week low", r"concern\w*", r"warn\w*",
    r"pressure", r"slowdown", r"layoff\w*", r"top loser", r"selloff", r"sell-off", r"tax demand",
    r"slip\w*", r"quits?", r"steps? down", r"muted", r"notices?", r"booked", r"misleading", r"ban(s|ned)?", r"strike", r"recall\w*",
]
_POS_RE = re.compile(r"\b(" + "|".join(_POSITIVE) + r")\b", re.I)
_NEG_RE = re.compile(r"\b(" + "|".join(_NEGATIVE) + r")\b", re.I)


_IGNORE_RE = re.compile(r"stop[- ]loss|profit[- ]booking|loss[- ]making|no[- ]loss", re.I)


def headline_tone(title: str) -> str:
    title = _IGNORE_RE.sub(" ", title)
    pos = len(_POS_RE.findall(title))
    neg = len(_NEG_RE.findall(title))
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


# ── fetch ────────────────────────────────────────────────────────────────────

_SUFFIX_RE = re.compile(r"\s+[-–|]\s+[^-–|]{2,60}$")


def _time_ago(dt: datetime, now: datetime) -> str:
    mins = max(0, int((now - dt).total_seconds() // 60))
    if mins < 60:
        return f"{mins} min ago"
    if mins < 24 * 60:
        return f"{mins // 60} hr ago"
    return f"{mins // (24 * 60)}d ago"


def fetch_feed(query: str, timeout: int = 8) -> bytes:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": f"{query} when:{LOOKBACK_DAYS}d", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def parse_feed(xml_data: bytes, stock: dict, now: Optional[datetime] = None) -> List[dict]:
    now = now or datetime.now(timezone.utc)
    oldest = now - timedelta(days=LOOKBACK_DAYS)
    aliases, excludes = aliases_for(stock), excludes_for(stock)
    root = ET.fromstring(xml_data)
    seen, articles = set(), []
    for item in root.findall("./channel/item"):
        raw_title = (item.findtext("title") or "").strip()
        src_el = item.find("source")
        source = (src_el.text or "").strip() if src_el is not None and src_el.text else ""
        title = _SUFFIX_RE.sub("", raw_title) if source and raw_title.endswith(source) else raw_title
        try:
            dt = email.utils.parsedate_to_datetime(item.findtext("pubDate") or "").astimezone(timezone.utc)
        except Exception:
            continue
        if dt < oldest or dt > now + timedelta(hours=1):
            continue
        if not any(mentions(title, a) for a in aliases) or any(mentions(title, x) for x in excludes):
            continue
        key = re.sub(r"[^a-z0-9 ]+", "", title.lower())[:60]
        if not key or key in seen:
            continue
        seen.add(key)
        articles.append({
            "title": title,
            "link": (item.findtext("link") or "").strip(),
            "source": source or "Google News",
            "published": dt.isoformat(),
            "time": _time_ago(dt, now),
            "tone": headline_tone(title),
            "_dt": dt,
        })
    articles.sort(key=lambda a: a["_dt"], reverse=True)
    articles = articles[:MAX_ARTICLES]
    for a in articles:
        a.pop("_dt")
    return articles


def summarize(articles: List[dict]) -> dict:
    counts = {t: sum(1 for a in articles if a["tone"] == t) for t in ("positive", "negative", "neutral")}
    total, pos, neg = len(articles), counts["positive"], counts["negative"]
    if not articles:
        label = "No recent news"
    elif pos * 2 >= total and pos > neg * 2:
        label = "Mostly positive"
    elif neg * 2 >= total and neg > pos * 2:
        label = "Mostly negative"
    elif counts["neutral"] * 2 > total and pos == neg:
        label = "Mostly neutral"
    elif pos > neg:
        label = "Leaning positive"
    elif neg > pos:
        label = "Leaning negative"
    else:
        label = "Mixed"
    return {**counts, "label": label}


def stock_news(stock: dict) -> dict:
    try:
        articles = parse_feed(fetch_feed(news_query(stock)), stock)
    except Exception as e:
        return {"symbol": stock["symbol"], "articles": [], "error": f"News feed unavailable: {e}"}
    return {
        "symbol": stock["symbol"],
        "lookback_days": LOOKBACK_DAYS,
        "articles": articles,
        "mood": summarize(articles),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
