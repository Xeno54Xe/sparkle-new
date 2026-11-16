"""Ask Sparkle data endpoints: report search, report reading and the stock snapshot."""
import ask_knowledge as ak
import main


def test_flatten_drops_empty_and_bookkeeping_fields():
    lines = ak.flatten({
        "revenue": {"label": "Not Available", "analysis": "No specific data disclosed in this document."},
        "guidance": {"label": "Raised", "analysis": "Margins guided up [p.4]."},
        "raw_scores": {"positive_prob": 0.9},
        "flags": ["a", "b"],
    })
    text = "\n".join(lines)
    assert "Revenue" not in text and "positive_prob" not in text.lower()
    assert "Margins guided up [p.4]." in text
    assert "Flags: a; b" in text


def test_search_finds_and_filters():
    hits = main.knowledge.search("deposit growth", company="HDFCBANK", limit=3)
    assert hits and all(h["company"] == "HDFC Bank" for h in hits)
    assert all(h["source"]["url"] == "/stock/HDFCBANK/intelligence" for h in hits if h["doc_type"] != "SR")
    only_sr = main.knowledge.search("analyst views valuation", doc_type="SR", limit=5)
    assert only_sr and all(h["doc_type"] == "SR" for h in only_sr)
    assert main.knowledge.search("the and of") == []  # stopwords only


def test_report_picks_latest_and_named_sections():
    full = main.knowledge.report("TCS", "EC")
    periods = main.knowledge.periods("TCS", "EC")
    assert full["period"] == periods[0]
    assert full["other_periods"] == periods[1:]
    part = main.knowledge.report("TCS", "EC", period=periods[-1], sections=["risk_intelligence"])
    assert part["period"] == periods[-1]
    assert "Risk Intelligence" in part["text"] and "Investment Synthesis" not in part["text"]
    assert "error" in main.knowledge.report("No Such Co", "EC")
    sr = main.knowledge.report("INFY", "SR")
    assert sr["source"]["url"] == "/stock/INFY/sparkle" and "Summary:" in sr["text"]


def test_resolve_company_by_symbol_name_and_folder():
    assert main.knowledge.resolve_company("RELIANCE.NS") == "Reliance Industries"
    assert main.knowledge.resolve_company("hdfc bank") == "HDFC Bank"
    assert main.knowledge.resolve_company("Infosys") == "Infosys"
    assert main.knowledge.resolve_company("zzzz") is None


def test_ask_endpoints(client):
    cat = client.get("/ask/catalog").json()["companies"]
    assert len(cat) >= 50 and any(c["symbol"] == "INFY" and c["sparkle_reports"] for c in cat)

    res = client.get("/ask/search", params={"q": "AI deals", "limit": 50}).json()
    assert 0 < len(res["results"]) <= 10

    rep = client.get("/ask/report", params={"company": "Infosys", "doc_type": "EC", "sections": "esg,unknown"}).json()
    assert "ESG" in rep["text"] and rep["company"] == "Infosys"


def test_ask_snapshot(client):
    snap = client.get("/ask/snapshot/infy").json()
    assert snap["symbol"] == "INFY" and snap["name"] == "Infosys"
    assert snap["price"]["price"] == 101.0
    assert snap["technical"]["signal"] in ("BUY", "SELL", "HOLD")
    assert set(snap["one_year_vs_nifty50"]) >= {"ret_1y", "vol", "beta", "alpha"}
    assert snap["fundamentals"]["pe_ratio"] > 0
    assert "EC" in snap["report_scores"]
    assert snap["links"]["sparkle_report"] == "/stock/INFY/sparkle"
    assert "error" in client.get("/ask/snapshot/NOTREAL").json()


def test_search_keeps_to_companies_named_in_the_question():
    assert main.knowledge.mentioned_companies("Compare HDFC Bank and ICICI Bank calls") == {"HDFC Bank", "ICICI Bank"}
    assert main.knowledge.mentioned_companies("M&M EV plans") == {"Mahindra & Mahindra"}
    assert main.knowledge.mentioned_companies("Which companies flagged greenwashing?") == set()
    hits = main.knowledge.search("How did Infosys management sound in its latest earnings call?", limit=5)
    assert hits and {h["company"] for h in hits} == {"Infosys"}
