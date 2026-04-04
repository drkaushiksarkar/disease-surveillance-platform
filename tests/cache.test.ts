import { LRUCache, cacheKey } from "../src/utils/cache";

describe("LRUCache", () => {
  it("stores and retrieves values", () => {
    const cache = new LRUCache(10);
    cache.set("k1", "v1");
    expect(cache.get("k1")).toBe("v1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new LRUCache(10);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts oldest on overflow", () => {
    const cache = new LRUCache(2);
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    cache.set("k3", "v3");
    expect(cache.get("k1")).toBeUndefined();
    expect(cache.get("k3")).toBe("v3");
  });

  it("updates LRU order on access", () => {
    const cache = new LRUCache(2);
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    cache.get("k1");
    cache.set("k3", "v3");
    expect(cache.get("k1")).toBe("v1");
    expect(cache.get("k2")).toBeUndefined();
  });

  it("tracks hit/miss stats", () => {
    const cache = new LRUCache(10);
    cache.set("k1", "v1");
    cache.get("k1");
    cache.get("miss");
    expect(cache.stats.hits).toBe(1);
    expect(cache.stats.misses).toBe(1);
  });

  it("clears all entries", () => {
    const cache = new LRUCache(10);
    cache.set("k1", "v1");
    cache.clear();
    expect(cache.get("k1")).toBeUndefined();
  });
});

describe("cacheKey", () => {
  it("is deterministic", () => {
    expect(cacheKey("a", 1)).toBe(cacheKey("a", 1));
  });
  it("differs for different args", () => {
    expect(cacheKey("a")).not.toBe(cacheKey("b"));
  });
});
