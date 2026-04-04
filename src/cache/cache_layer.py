"""Multi-tier cache with LRU eviction, TTL, and write-through support."""
from __future__ import annotations
import hashlib, json, threading, time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

@dataclass
class CacheEntry:
    key: str; value: Any; created_at: float; expires_at: float; access_count: int = 0; size_bytes: int = 0

class LRUCache:
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600) -> None:
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._max_size = max_size; self._default_ttl = default_ttl
        self._lock = threading.Lock(); self._hits = 0; self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None: self._misses += 1; return None
            if time.monotonic() > entry.expires_at:
                del self._store[key]; self._misses += 1; return None
            self._store.move_to_end(key); entry.access_count += 1; self._hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            t = ttl if ttl is not None else self._default_ttl
            entry = CacheEntry(key=key, value=value, created_at=time.monotonic(),
                expires_at=time.monotonic() + t, size_bytes=len(str(value)))
            if key in self._store: del self._store[key]
            elif len(self._store) >= self._max_size: self._store.popitem(last=False)
            self._store[key] = entry

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store: del self._store[key]; return True
            return False

    def clear(self) -> int:
        with self._lock: count = len(self._store); self._store.clear(); return count

    def keys(self, pattern: str = "*") -> list[str]:
        import fnmatch
        with self._lock:
            if pattern == "*": return list(self._store.keys())
            return [k for k in self._store if fnmatch.fnmatch(k, pattern)]

    @property
    def stats(self) -> dict[str, Any]:
        total = self._hits + self._misses
        return {"size": len(self._store), "max_size": self._max_size, "hits": self._hits,
            "misses": self._misses, "hit_rate": self._hits / total if total > 0 else 0.0}

class TieredCache:
    def __init__(self, l1_size: int = 100, l2_size: int = 10000,
                 l1_ttl: int = 60, l2_ttl: int = 3600) -> None:
        self.l1 = LRUCache(max_size=l1_size, default_ttl=l1_ttl)
        self.l2 = LRUCache(max_size=l2_size, default_ttl=l2_ttl)

    def get(self, key: str) -> Optional[Any]:
        val = self.l1.get(key)
        if val is not None: return val
        val = self.l2.get(key)
        if val is not None: self.l1.set(key, val); return val
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        self.l1.set(key, value, ttl); self.l2.set(key, value, ttl)

    def invalidate(self, key: str) -> None:
        self.l1.delete(key); self.l2.delete(key)

def cached(ttl: int = 3600, key_fn: Optional[Callable] = None) -> Callable:
    _cache = LRUCache(default_ttl=ttl)
    def decorator(func: Callable) -> Callable:
        import functools
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if key_fn: cache_key = key_fn(*args, **kwargs)
            else: cache_key = hashlib.md5(f"{func.__name__}:{args}:{kwargs}".encode()).hexdigest()
            result = _cache.get(cache_key)
            if result is not None: return result
            result = func(*args, **kwargs)
            _cache.set(cache_key, result); return result
        wrapper.cache = _cache; return wrapper
    return decorator
