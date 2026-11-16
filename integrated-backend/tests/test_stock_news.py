from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

import stock_news
from stock_news import headline_tone, parse_feed, summarize
from stocks import find_stock

NOW = datetime(2026, 10, 18, 6, 0, tzinfo=timezone.utc)


def feed(items):
    rows = "".join(
        f"<item><title>{escape(t)} - {src}</title><link>https://example.com/{i}</link>"
        f"<pubDate>{(NOW - timedelta(hours=h)).strftime('%a, %d %b %Y %H:%M:%S GMT')}</pubDate>"
        f"<source url='https://example.com'>{src}</source></item>"
        for i, (t, src, h) in enumerate(items)
    )
    return f"<?xml version='1.0'?><rss><channel>{rows}</channel></rss>".encode()


def test_keeps_only_headlines_naming_the_company():
    reliance = find_stock("RELIANCE")
    xml = feed([
        ("RIL shares jump after Jio update", "Mint", 1),
        ("Reliance Power shares fall 5%", "ET", 2),          # different company
        ("Sensex ends flat; banks lead", "ET", 3),            # doesn't name it
        ("Reliance Industries to raise funds", "BS", 4),
    ])
    titles = [a["title"] for a in parse_feed(xml, reliance, NOW)]
    assert titles == ["RIL shares jump after Jio update", "Reliance Industries to raise funds"]


def test_capital_symbols_match_only_in_capitals():
    tcs = find_stock("TCS")
    xml = feed([("tcs-style clips are trending", "Blog", 1), ("TCS wins a large deal", "Mint", 2)])
    assert [a["title"] for a in parse_feed(xml, tcs, NOW)] == ["TCS wins a large deal"]


def test_lt_finance_is_not_lt():
    lt = find_stock("LT")
    xml = feed([("L&T Finance Q2 profit rises 33%", "Mint", 1), ("L&T bags mega order", "ET", 2)])
    assert [a["title"] for a in parse_feed(xml, lt, NOW)] == ["L&T bags mega order"]


def test_old_and_duplicate_headlines_are_dropped_and_newest_first():
    infy = find_stock("INFY")
    xml = feed([
        ("Infosys raises guidance", "Mint", 30),
        ("Infosys raises guidance", "ET", 31),                # duplicate
        ("Infosys shares slide", "ET", 5),
        ("Infosys wins deal", "BS", 24 * 9),                  # older than 7 days
    ])
    out = parse_feed(xml, infy, NOW)
    assert [a["title"] for a in out] == ["Infosys shares slide", "Infosys raises guidance"]
    assert out[0]["source"] == "ET" and out[0]["time"] == "5 hr ago"
    assert "_dt" not in out[0]


def test_at_most_eight_articles():
    infy = find_stock("INFY")
    xml = feed([(f"Infosys update number {i}", "ET", i + 1) for i in range(12)])
    assert len(parse_feed(xml, infy, NOW)) == stock_news.MAX_ARTICLES


def test_tone():
    assert headline_tone("TCS Q2 profit rises 5%, beats estimates") == "positive"
    assert headline_tone("Infosys shares fall 3% after weak guidance") == "negative"
    assert headline_tone("Stocks to buy: Bajaj Finance, target price and stop-loss") == "neutral"
    assert headline_tone("FSSAI issues notices to Nestle India") == "negative"
    assert headline_tone("TCS schedules US roadshow") == "neutral"
    assert headline_tone("Deputy MD to step down at year-end, board approves exit") == "neutral"
    assert headline_tone("HDFC Bank veteran quits") == "negative"
    assert headline_tone("HDFC Bank Q2 net profit grows 4.7%") == "positive"


def test_summary_labels():
    def label(p, n, z):
        return summarize([{"tone": "positive"}] * p + [{"tone": "negative"}] * n + [{"tone": "neutral"}] * z)["label"]
    assert summarize([])["label"] == "No recent news"
    assert label(5, 1, 2) == "Mostly positive"
    assert label(0, 3, 2) == "Mostly negative"
    assert label(2, 0, 6) == "Leaning positive"      # 2 of 8 is not "mostly"
    assert label(1, 3, 4) == "Leaning negative"
    assert label(0, 0, 8) == "Mostly neutral"
    assert label(1, 1, 6) == "Mostly neutral"
    assert label(3, 3, 2) == "Mixed"
    assert summarize([{"tone": "positive"}, {"tone": "neutral"}]) == {"positive": 1, "negative": 0, "neutral": 1, "label": "Mostly positive"}


def test_feed_failure_is_reported_not_raised(monkeypatch):
    def down(query, timeout=8):
        raise OSError("network unreachable")
    monkeypatch.setattr(stock_news, "fetch_feed", down)
    out = stock_news.stock_news(find_stock("TCS"))
    assert out["articles"] == [] and "unavailable" in out["error"]


def test_every_stock_has_a_query_and_aliases():
    import stocks
    for s in stocks.STOCKS:
        assert stock_news.news_query(s).startswith('"')
        assert stock_news.aliases_for(s)
