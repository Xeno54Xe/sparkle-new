"""Search and read the AI-written reports, for the Ask Sparkle assistant.

The corpus is every earnings-call (EC) and annual-report (AR) analysis
(advanced.json, or beginner.json when there is no advanced file) and every
Sparkle Report (sparkle.json) under outputs/. Each report section becomes one
searchable passage. Search is BM25 over words, with an optional filter by
company and report type. Everything is built in memory on first use (well
under a second for the current ~2,000 passages) and needs no external service.
"""
from __future__ import annotations

import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional

DOC_TYPES = {"EC": "Earnings call", "AR": "Annual report", "SR": "Sparkle Report"}

# Fields that are bookkeeping or raw model numbers, not prose worth reading.
SKIP_KEYS = {"raw_scores", "doc_meta", "section", "metrics", "meta", "doc_type", "file_path", "filename",
             "previous", "fallback_blocks", "data_sources"}

STOPWORDS = set("""a an and are as at be been but by can could did do does for from had has have how i if in into
is it its may might more most of on or our over so such than that the their them then there these they this to
was were what when where which while who why will with would about after against all also any because before
between both each few further here just only other out own same should some still through under until up very
we you your company companies stock stocks share shares""".split())

TOKEN = re.compile(r"[a-z0-9][a-z0-9&.%-]*")


def tokenize(text: str) -> List[str]:
    out = []
    for tok in TOKEN.findall(text.lower()):
        tok = tok.strip(".-")
        if len(tok) > 1 and tok not in STOPWORDS:
            out.append(tok)
    return out


def _humanize(key: str) -> str:
    return key.replace("_", " ").strip().capitalize()


def _empty_field(v) -> bool:
    """Fields the report writer filled with 'Not Available / No specific data disclosed'."""
    if not isinstance(v, dict):
        return False
    label = str(v.get("label") or "").lower()
    analysis = str(v.get("analysis") or "").lower()
    return label in ("not available", "n/a") or analysis.startswith("no specific data")


def flatten(node, prefix: str = "", out: Optional[List[str]] = None, depth: int = 0) -> List[str]:
    """Turn a report section into readable 'Field: value' lines, dropping bookkeeping fields."""
    if out is None:
        out = []
    if depth > 6:
        return out
    if isinstance(node, dict):
        for k, v in node.items():
            if k in SKIP_KEYS or v in (None, "", [], {}) or _empty_field(v):
                continue
            label = _humanize(k)
            if isinstance(v, (dict, list)):
                if isinstance(v, list) and all(isinstance(x, str) for x in v):
                    out.append(f"{prefix}{label}: " + "; ".join(v))
                else:
                    out.append(f"{prefix}{label}:")
                    flatten(v, prefix + "  ", out, depth + 1)
            else:
                out.append(f"{prefix}{label}: {v}")
    elif isinstance(node, list):
        for item in node:
            if _empty_field(item):
                continue
            if isinstance(item, (dict, list)):
                flatten(item, prefix + "- ", out, depth + 1)
            elif item not in (None, ""):
                out.append(f"{prefix}- {item}")
    elif node not in (None, ""):
        out.append(f"{prefix}{node}")
    return out


@dataclass
class Passage:
    company: str            # outputs folder name, e.g. "HDFC Bank"
    symbol: Optional[str]   # NSE symbol when the company is in the Nifty 50 list
    doc_type: str           # EC | AR | SR
    period: str             # FEB26, FY25, or a date for SR
    section: str            # section key
    title: str
    score: Optional[float]
    label: Optional[str]
    text: str
    tokens: List[str] = field(default_factory=list, repr=False)

    def source(self) -> dict:
        return report_source(self.company, self.symbol, self.doc_type, self.period)


def report_source(company: str, symbol: Optional[str], doc_type: str, period: str) -> dict:
    """Where a person can read this report in the app."""
    name = DOC_TYPES.get(doc_type, doc_type)
    if symbol:
        page = f"/stock/{symbol}/sparkle" if doc_type == "SR" else f"/stock/{symbol}/intelligence"
    else:
        page = "/reports"
    return {
        "title": f"{company} · {name} {period}",
        "url": page,
        "pdf": f"/api/backend/data/{company}/{doc_type}/{period}/report.pdf",
    }


def _period_key(doc_type: str, period: str):
    """Sort key so the newest report comes first (EC like FEB26, AR like FY25, SR dates)."""
    if doc_type == "SR":
        return period
    months = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split()
    m = re.match(r"([A-Z]{3})(\d{2})$", period)
    if m and m.group(1) in months:
        return f"20{m.group(2)}-{months.index(m.group(1)) + 1:02d}"
    m = re.match(r"FY(\d{2})$", period)
    if m:
        return f"20{m.group(1)}-13"
    return period


class Knowledge:
    def __init__(self, outputs_dir: str, folder_to_symbol: Dict[str, str]):
        self.outputs_dir = outputs_dir
        self.folder_to_symbol = folder_to_symbol
        self.passages: List[Passage] = []
        self.docs: Dict[tuple, dict] = {}      # (company, doc_type, period) -> parsed json
        self._df: Counter = Counter()
        self._avg_len = 1.0
        self._loaded = False

    # ── loading ──────────────────────────────────────────────────────────
    def load(self) -> "Knowledge":
        if self._loaded:
            return self
        if os.path.isdir(self.outputs_dir):
            for company in sorted(os.listdir(self.outputs_dir)):
                cdir = os.path.join(self.outputs_dir, company)
                if not os.path.isdir(cdir):
                    continue
                for doc_type in ("EC", "AR", "SR"):
                    tdir = os.path.join(cdir, doc_type)
                    if not os.path.isdir(tdir):
                        continue
                    for period in sorted(os.listdir(tdir)):
                        self._load_doc(company, doc_type, period, os.path.join(tdir, period))
        for p in self.passages:
            self._df.update(set(p.tokens))
        if self.passages:
            self._avg_len = sum(len(p.tokens) for p in self.passages) / len(self.passages)
        self._loaded = True
        return self

    def _load_doc(self, company: str, doc_type: str, period: str, pdir: str):
        names = ["sparkle.json"] if doc_type == "SR" else ["advanced.json", "beginner.json"]
        data = None
        for name in names:
            fp = os.path.join(pdir, name)
            if os.path.exists(fp):
                try:
                    with open(fp, encoding="utf-8") as f:
                        data = json.load(f)
                    break
                except (OSError, ValueError):
                    continue
        if not isinstance(data, dict):
            return
        self.docs[(company, doc_type, period)] = data
        symbol = self.folder_to_symbol.get(company) or (data.get("symbol") if doc_type == "SR" else None)
        sections = data.get("sections") or {}
        if doc_type == "SR" and data.get("summary"):
            sections = {"summary": {"title": "Summary", **data["summary"]}, **sections}
        for key, sec in sections.items():
            if not isinstance(sec, dict):
                continue
            title = sec.get("title") or _humanize(key)
            body = "\n".join(flatten({k: v for k, v in sec.items() if k not in ("title", "score", "label")}))
            text = f"{company} {DOC_TYPES[doc_type]} {period} - {title}\n{body}".strip()
            tokens = tokenize(f"{company} {symbol or ''} {title} {title} {body}")
            score = sec.get("score")
            self.passages.append(Passage(
                company=company, symbol=symbol, doc_type=doc_type, period=period, section=key, title=title,
                score=float(score) if isinstance(score, (int, float)) else None,
                label=sec.get("label"), text=text, tokens=tokens,
            ))

    # ── lookup ───────────────────────────────────────────────────────────
    def companies(self) -> List[str]:
        return sorted({c for c, _, _ in self.load().docs})

    def resolve_company(self, name: Optional[str]) -> Optional[str]:
        """Match a company name, folder or NSE symbol to an outputs folder."""
        if not name:
            return None
        self.load()
        needle = name.strip().lower().replace("_", " ")
        if needle.endswith(".ns"):
            needle = needle[:-3]
        for folder, sym in self.folder_to_symbol.items():
            if sym and sym.lower() == needle:
                return folder
        companies = self.companies()
        for c in companies:
            if c.lower() == needle:
                return c
        for c in companies:
            if needle in c.lower() or c.lower() in needle:
                return c
        return None

    def mentioned_companies(self, text: str) -> set:
        """Companies named in free text, by full name or NSE symbol ("Infosys", "HDFC Bank", "TCS")."""
        low = f" {text.lower()} "
        words = set(re.findall(r"[a-z0-9&-]+", low))
        found = set()
        for company in self.companies():
            if f" {company.lower()} " in low or re.search(rf"\b{re.escape(company.lower())}\b", low):
                found.add(company)
        for folder, sym in self.folder_to_symbol.items():
            if sym and sym.lower() in words and len(sym) >= 2 and sym.lower() not in STOPWORDS:
                found.add(folder)
        return found

    def periods(self, company: str, doc_type: str) -> List[str]:
        found = [p for c, t, p in self.load().docs if c == company and t == doc_type]
        return sorted(found, key=lambda p: _period_key(doc_type, p), reverse=True)

    def catalog(self) -> List[dict]:
        out = []
        for company in self.companies():
            out.append({
                "company": company,
                "symbol": self.folder_to_symbol.get(company),
                "earnings_calls": self.periods(company, "EC"),
                "annual_reports": self.periods(company, "AR"),
                "sparkle_reports": self.periods(company, "SR"),
            })
        return out

    # ── search ───────────────────────────────────────────────────────────
    def search(self, query: str, company: Optional[str] = None, doc_type: Optional[str] = None,
               limit: int = 6, snippet_chars: int = 900) -> List[dict]:
        self.load()
        q_tokens = tokenize(query)
        if not q_tokens:
            return []
        folders = {self.resolve_company(company)} - {None} if company else self.mentioned_companies(query)
        dt = doc_type.upper() if doc_type else None
        n = len(self.passages)
        k1, b = 1.4, 0.75
        idf = {t: math.log(1 + (n - self._df.get(t, 0) + 0.5) / (self._df.get(t, 0) + 0.5)) for t in set(q_tokens)}
        scored = []
        for p in self.passages:
            if folders and p.company not in folders:
                continue
            if dt and p.doc_type != dt:
                continue
            tf = Counter(t for t in p.tokens if t in idf)
            if not tf:
                continue
            norm = k1 * (1 - b + b * len(p.tokens) / self._avg_len)
            s = sum(idf[t] * tf[t] * (k1 + 1) / (tf[t] + norm) for t in tf)
            # Newer reports slightly ahead when relevance is otherwise similar.
            s *= 1 + 0.02 * self._recency_rank(p)
            scored.append((s, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for s, p in scored[:limit]:
            results.append({
                "company": p.company,
                "symbol": p.symbol,
                "doc_type": p.doc_type,
                "report": DOC_TYPES[p.doc_type],
                "period": p.period,
                "section": p.title,
                "section_score": p.score,
                "section_label": p.label,
                "relevance": round(s, 2),
                "excerpt": best_window(p.text, q_tokens, snippet_chars),
                "source": p.source(),
            })
        return results

    def _recency_rank(self, p: Passage) -> int:
        periods = self.periods(p.company, p.doc_type)
        return max(0, 3 - periods.index(p.period)) if p.period in periods else 0

    # ── read one report ──────────────────────────────────────────────────
    def report(self, company: str, doc_type: str, period: Optional[str] = None,
               sections: Optional[Iterable[str]] = None, max_chars: int = 9000) -> dict:
        folder = self.resolve_company(company)
        dt = (doc_type or "EC").upper()
        if not folder:
            return {"error": f"No reports found for '{company}'."}
        periods = self.periods(folder, dt)
        if not periods:
            return {"error": f"No {DOC_TYPES.get(dt, dt)} reports for {folder}.",
                    "available": {t: self.periods(folder, t) for t in DOC_TYPES}}
        chosen = period.upper() if period and dt != "SR" else period
        if not chosen or chosen not in periods:
            chosen = periods[0]
        data = self.docs[(folder, dt, chosen)]
        all_sections = data.get("sections") or {}
        wanted = [s for s in (sections or []) if s in all_sections] or list(all_sections)
        parts = []
        if dt == "SR" and data.get("summary"):
            parts += ["Summary:"] + flatten(data["summary"], "  ")
            if data.get("changes"):
                parts += ["Changes since the previous report:"] + flatten(data["changes"], "  ")
        for key in wanted:
            sec = all_sections[key]
            if not isinstance(sec, dict):
                continue
            title = sec.get("title") or _humanize(key)
            head = f"## {title}"
            if sec.get("score") is not None:
                head += f" (score {sec.get('score')}/100, {sec.get('label')})"
            parts.append(head)
            parts += flatten({k: v for k, v in sec.items() if k not in ("title", "score", "label")})
        text = "\n".join(parts)
        truncated = len(text) > max_chars
        symbol = self.folder_to_symbol.get(folder) or data.get("symbol")
        return {
            "company": folder,
            "symbol": symbol,
            "doc_type": dt,
            "report": DOC_TYPES[dt],
            "period": chosen,
            "other_periods": [p for p in periods if p != chosen],
            "sections_available": list(all_sections),
            "text": text[:max_chars] + ("\n[truncated: ask for specific sections to read the rest]" if truncated else ""),
            "source": report_source(folder, symbol, dt, chosen),
        }

    def scores(self, company: str) -> dict:
        """Latest section scores per report type, for a quick overview."""
        folder = self.resolve_company(company)
        if not folder:
            return {}
        out = {}
        for dt in DOC_TYPES:
            periods = self.periods(folder, dt)
            if not periods:
                continue
            data = self.docs[(folder, dt, periods[0])]
            secs = data.get("sections") or {}
            out[dt] = {
                "period": periods[0],
                "scores": {(v.get("title") or k): {"score": v.get("score"), "label": v.get("label")}
                           for k, v in secs.items() if isinstance(v, dict) and v.get("score") is not None},
            }
            if dt == "SR":
                out[dt]["headline"] = (data.get("summary") or {}).get("headline")
        return out


def best_window(text: str, q_tokens: List[str], size: int) -> str:
    """The stretch of `text` (about `size` chars) with the most query words, starting on a line."""
    if len(text) <= size:
        return text
    lines = text.split("\n")
    qset = set(q_tokens)
    best, best_hits = 0, -1
    for i in range(len(lines)):
        chunk, hits = 0, 0
        for line in lines[i:]:
            if chunk + len(line) > size:
                break
            chunk += len(line) + 1
            hits += sum(1 for t in tokenize(line) if t in qset)
        if hits > best_hits:
            best, best_hits = i, hits
    out, used = [], 0
    for line in lines[best:]:
        if used + len(line) > size:
            break
        out.append(line)
        used += len(line) + 1
    header = lines[0] if best > 0 else ""
    return ((header + "\n…\n") if header else "") + "\n".join(out)
