"""Keeps the slow market responses ready in memory.

The heatmap, screener, indices, most-active and news endpoints each take
several seconds to build from Yahoo Finance / Google News. A background
thread rebuilds them on a timer, so requests are answered from the last
good result instead of waiting.

- Refresh is faster while NSE is open (Mon-Fri 09:00-15:45 IST) and slower
  otherwise, when prices don't move.
- A result that comes back empty or with an error never replaces a good one;
  the last good result keeps being served.
- With the thread off (SPARKLE_PRECOMPUTE=0, used by the tests) the same code
  behaves as a plain time-based cache: the first request builds the result.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, Optional, Tuple

log = logging.getLogger("sparkle.precompute")

IST = timezone(timedelta(hours=5, minutes=30))
TICK_SECONDS = 15
RETRY_SECONDS = 60  # after a failed build, wait this long before trying again


def market_open(now: Optional[datetime] = None) -> bool:
    """True from the 09:00 pre-open to 15:45 IST on weekdays (holidays not tracked)."""
    now = (now or datetime.now(IST)).astimezone(IST)
    if now.weekday() >= 5:
        return False
    minutes = now.hour * 60 + now.minute
    return 9 * 60 <= minutes <= 15 * 60 + 45


class Job:
    def __init__(self, name: str, compute: Callable[[], dict], is_good: Callable[[dict], bool],
                 open_every: int, closed_every: int):
        self.name = name
        self.compute = compute
        self.is_good = is_good
        self.open_every = open_every
        self.closed_every = closed_every
        self.value: Optional[dict] = None
        self.updated_at = 0.0
        self.last_error: Optional[str] = None
        self.last_attempt = 0.0
        self.lock = threading.Lock()

    def interval(self) -> int:
        return self.open_every if market_open() else self.closed_every

    def age(self) -> float:
        return time.time() - self.updated_at

    def fresh(self) -> bool:
        return self.value is not None and self.age() < self.interval()

    def recently_failed(self) -> bool:
        return self.last_error is not None and time.time() - self.last_attempt < RETRY_SECONDS

    def run(self) -> dict:
        """Build a new result; store it only if it is good."""
        self.last_attempt = time.time()
        try:
            result = self.compute()
        except Exception as e:  # compute functions normally catch their own errors
            log.exception("precompute %s failed", self.name)
            result = {"error": str(e)}
        if self.is_good(result):
            self.value = result
            self.updated_at = time.time()
            self.last_error = None
        else:
            self.last_error = str(result.get("error") or "empty result") if isinstance(result, dict) else "bad result"
        return result


class Precomputer:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def register(self, name: str, compute: Callable[[], dict], is_good: Callable[[dict], bool],
                 open_every: int, closed_every: int) -> None:
        self.jobs[name] = Job(name, compute, is_good, open_every, closed_every)

    def serve(self, name: str) -> Tuple[dict, Optional[float]]:
        """Return (result, age in seconds). Age is None when built for this request."""
        job = self.jobs[name]
        if job.fresh() or (job.value is not None and job.recently_failed()):
            return job.value, job.age()
        with job.lock:
            # Another request or the background thread may have just built it.
            if job.fresh() or (job.value is not None and job.recently_failed()):
                return job.value, job.age()
            result = job.run()
        if job.is_good(result):
            return result, None
        if job.value is not None:  # serve the last good result rather than an error
            return job.value, job.age()
        return result, None

    def refresh_due(self) -> None:
        for job in self.jobs.values():
            if self._stop.is_set():
                return
            if job.fresh() or job.recently_failed():
                continue
            with job.lock:
                if not (job.fresh() or job.recently_failed()):
                    job.run()

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.refresh_due()
            except Exception:
                log.exception("precompute loop error")
            self._stop.wait(TICK_SECONDS)

    def start(self) -> None:
        if os.environ.get("SPARKLE_PRECOMPUTE", "1") == "0" or self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="sparkle-precompute", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None

    def status(self) -> dict:
        return {
            "running": self._thread is not None and self._thread.is_alive(),
            "market_open": market_open(),
            "jobs": {
                name: {
                    "ready": job.value is not None,
                    "age_s": int(job.age()) if job.value is not None else None,
                    "refresh_every_s": job.interval(),
                    "last_error": job.last_error,
                }
                for name, job in self.jobs.items()
            },
        }
