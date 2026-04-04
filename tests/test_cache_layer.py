"""Tests for multi-tier cache."""
import time
import pytest

class TestLRUCache:
    def test_get_set(self):
        from cache.layer import LRUCache
        c = LRUCache(); c.set("k1", "v1"); assert c.get("k1") == "v1"
    def test_ttl_expiry(self):
        from cache.layer import LRUCache
        c = LRUCache(default_ttl=1); c.set("k1", "v1", ttl=0)
        time.sleep(0.01); assert c.get("k1") is None
    def test_lru_eviction(self):
        from cache.layer import LRUCache
        c = LRUCache(max_size=2); c.set("a", 1); c.set("b", 2); c.set("c", 3)
        assert c.get("a") is None; assert c.get("b") == 2; assert c.get("c") == 3
    def test_delete(self):
        from cache.layer import LRUCache
        c = LRUCache(); c.set("k", "v"); assert c.delete("k"); assert c.get("k") is None
    def test_clear(self):
        from cache.layer import LRUCache
        c = LRUCache(); c.set("a", 1); c.set("b", 2); assert c.clear() == 2
    def test_stats(self):
        from cache.layer import LRUCache
        c = LRUCache(); c.set("k", "v"); c.get("k"); c.get("missing")
        s = c.stats; assert s["hits"] == 1; assert s["misses"] == 1
    def test_keys_pattern(self):
        from cache.layer import LRUCache
        c = LRUCache(); c.set("user:1", "a"); c.set("user:2", "b"); c.set("post:1", "c")
        assert len(c.keys("user:*")) == 2

class TestTieredCache:
    def test_l1_promotion(self):
        from cache.layer import TieredCache
        tc = TieredCache(); tc.l2.set("k", "v")
        assert tc.get("k") == "v"; assert tc.l1.get("k") == "v"
    def test_invalidate(self):
        from cache.layer import TieredCache
        tc = TieredCache(); tc.set("k", "v"); tc.invalidate("k")
        assert tc.get("k") is None
