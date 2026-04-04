/**
 * Multi-tier caching for analytical queries and model inference.
 * Supports in-memory LRU with TTL expiration.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private maxSize: number = 1024,
    private ttl: number = 3600000,
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }
}

export function cacheKey(...args: unknown[]): string {
  const raw = JSON.stringify(args);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}
