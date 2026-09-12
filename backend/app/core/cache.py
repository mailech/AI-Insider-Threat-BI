"""Cache adapter: Redis when it is reachable, an in-process dict when it is not.

Dashboard aggregates are the expensive reads on this platform -- the manager
dashboard alone fans out across employees, anomalies, risk scores and incidents.
Caching them for a minute takes the cost of a dashboard refresh from dozens of
aggregate queries to one round trip.

Redis is optional on purpose. A developer running ``uvicorn app.main:app`` with
nothing but SQLite gets the in-process fallback and identical behaviour, only
without cross-process sharing. Nothing in the platform may assume a cache hit:
every caller must work correctly when ``get`` returns ``None`` forever.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger("itbis.cache")


class _MemoryCache:
    """Process-local TTL cache used whenever Redis is unavailable."""

    def __init__(self) -> None:
        self._data: Dict[str, Tuple[float, str]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            expires_at, payload = entry
            if expires_at < time.time():
                self._data.pop(key, None)
                return None
            return payload

    def set(self, key: str, payload: str, ttl: int) -> None:
        with self._lock:
            self._data[key] = (time.time() + ttl, payload)

    def delete_prefix(self, prefix: str) -> int:
        with self._lock:
            doomed = [k for k in self._data if k.startswith(prefix)]
            for k in doomed:
                self._data.pop(k, None)
            return len(doomed)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


class Cache:
    """Uniform cache surface over Redis or the in-process fallback."""

    def __init__(self) -> None:
        self._memory = _MemoryCache()
        self._redis = None
        self._backend = "memory"
        self._connect()

    def _connect(self) -> None:
        url = (settings.REDIS_URL or "").strip()
        if not url:
            logger.info("REDIS_URL not set - caching in process memory")
            return
        try:
            import redis  # imported lazily so the dependency stays optional

            client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
            client.ping()
        except Exception as exc:
            logger.warning("Redis at %s unreachable (%s) - caching in process memory", url, exc)
            return
        self._redis = client
        self._backend = "redis"
        logger.info("Cache backend: Redis at %s", url)

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def available(self) -> bool:
        return self._redis is not None

    def get(self, key: str) -> Optional[Any]:
        try:
            payload = self._redis.get(key) if self._redis else self._memory.get(key)
        except Exception as exc:  # a dead Redis must never break a request
            logger.warning("Cache read failed for %s (%s)", key, exc)
            return None
        if payload is None:
            return None
        try:
            return json.loads(payload)
        except (TypeError, json.JSONDecodeError):
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl = ttl or settings.CACHE_TTL_SECONDS
        try:
            payload = json.dumps(value, default=str)
        except (TypeError, ValueError):
            return  # unserialisable values are simply not cached
        try:
            if self._redis:
                self._redis.setex(key, ttl, payload)
            else:
                self._memory.set(key, payload, ttl)
        except Exception as exc:
            logger.warning("Cache write failed for %s (%s)", key, exc)

    def invalidate(self, prefix: str) -> int:
        """Drop every key under a prefix. Called when the pipeline writes new data."""
        try:
            if self._redis:
                removed = 0
                for key in self._redis.scan_iter(match=f"{prefix}*", count=500):
                    self._redis.delete(key)
                    removed += 1
                return removed
            return self._memory.delete_prefix(prefix)
        except Exception as exc:
            logger.warning("Cache invalidation failed for %s (%s)", prefix, exc)
            return 0

    def clear(self) -> None:
        try:
            if self._redis:
                self._redis.flushdb()
            else:
                self._memory.clear()
        except Exception as exc:
            logger.warning("Cache clear failed (%s)", exc)

    def get_or_set(self, key: str, producer: Callable[[], Any], ttl: Optional[int] = None) -> Any:
        """Return the cached value, computing and storing it on a miss."""
        hit = self.get(key)
        if hit is not None:
            return hit
        value = producer()
        self.set(key, value, ttl)
        return value


cache = Cache()

# Prefixes are namespaced so the pipeline can invalidate one family of reads
# without flushing the whole database.
DASHBOARD_PREFIX = "dash:"
RISK_PREFIX = "risk:"
UEBA_PREFIX = "ueba:"


def invalidate_analytics() -> int:
    """Drop every derived read-model after detection/scoring writes new rows."""
    return sum(cache.invalidate(p) for p in (DASHBOARD_PREFIX, RISK_PREFIX, UEBA_PREFIX))
