from datetime import datetime

import precompute
from precompute import IST, Precomputer, market_open


def good(r):
    return bool(r.get("items"))


def test_market_hours():
    assert market_open(datetime(2026, 10, 16, 9, 0, tzinfo=IST))        # Friday open
    assert market_open(datetime(2026, 10, 16, 15, 45, tzinfo=IST))
    assert not market_open(datetime(2026, 10, 16, 8, 59, tzinfo=IST))
    assert not market_open(datetime(2026, 10, 16, 15, 46, tzinfo=IST))
    assert not market_open(datetime(2026, 10, 17, 11, 0, tzinfo=IST))   # Saturday


def test_serves_from_memory_until_stale(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(precompute.time, "time", lambda: clock[0])
    n = {"builds": 0}

    def build():
        n["builds"] += 1
        return {"items": [n["builds"]]}

    p = Precomputer()
    p.register("x", build, good, open_every=60, closed_every=60)
    assert p.serve("x") == ({"items": [1]}, None)    # built for this request
    clock[0] += 30
    assert p.serve("x") == ({"items": [1]}, 30)      # from memory
    assert n["builds"] == 1
    clock[0] += 31
    assert p.serve("x")[0] == {"items": [2]}         # stale, rebuilt


def test_bad_result_never_replaces_good_one(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(precompute.time, "time", lambda: clock[0])
    results = [{"items": [1]}, {"error": "Yahoo down", "items": []}]
    p = Precomputer()
    p.register("x", lambda: results.pop(0), good, open_every=60, closed_every=60)
    p.serve("x")
    clock[0] += 61
    value, age = p.serve("x")
    assert value == {"items": [1]} and age == 61
    assert p.status()["jobs"]["x"]["last_error"] == "Yahoo down"


def test_failures_back_off(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(precompute.time, "time", lambda: clock[0])
    n = {"builds": 0}

    def build():
        n["builds"] += 1
        return {"items": [1]} if n["builds"] == 1 else {"error": "down"}

    p = Precomputer()
    p.register("x", build, good, open_every=60, closed_every=60)
    p.refresh_due()                  # 1st build, good
    clock[0] += 61
    p.refresh_due()                  # 2nd build fails
    clock[0] += 15
    p.refresh_due()                  # within the retry wait: skipped
    p.serve("x")                     # requests get the old value, no rebuild
    assert n["builds"] == 2
    clock[0] += precompute.RETRY_SECONDS
    p.refresh_due()
    assert n["builds"] == 3


def test_exception_in_build_is_contained():
    def boom():
        raise RuntimeError("bad")

    p = Precomputer()
    p.register("x", boom, good, open_every=60, closed_every=60)
    value, _ = p.serve("x")
    assert value == {"error": "bad"}


def test_thread_off_by_env(monkeypatch):
    monkeypatch.setenv("SPARKLE_PRECOMPUTE", "0")
    p = Precomputer()
    p.start()
    assert p.status()["running"] is False
