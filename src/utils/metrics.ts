/**
 * Metrics collection for health intelligence services.
 * Provides counters, gauges, and histograms.
 */

export class Counter {
  private _value = 0;
  constructor(public readonly name: string, public readonly description: string = "") {}
  inc(amount = 1): void { this._value += amount; }
  get value(): number { return this._value; }
}

export class Gauge {
  private _value = 0;
  constructor(public readonly name: string, public readonly description: string = "") {}
  set(value: number): void { this._value = value; }
  inc(amount = 1): void { this._value += amount; }
  dec(amount = 1): void { this._value -= amount; }
  get value(): number { return this._value; }
}

export class Histogram {
  private counts: Map<number, number>;
  private _sum = 0;
  private _count = 0;

  constructor(
    public readonly name: string,
    public readonly description: string = "",
    private buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  ) {
    this.counts = new Map(buckets.map((b) => [b, 0]));
    this.counts.set(Infinity, 0);
  }

  observe(value: number): void {
    this._sum += value;
    this._count++;
    for (const b of this.buckets) { if (value <= b) this.counts.set(b, (this.counts.get(b) || 0) + 1); }
    this.counts.set(Infinity, (this.counts.get(Infinity) || 0) + 1);
  }

  get stats() { return { count: this._count, sum: this._sum }; }
}

export class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();

  counter(name: string, desc = ""): Counter {
    if (!this.counters.has(name)) this.counters.set(name, new Counter(name, desc));
    return this.counters.get(name)!;
  }

  gauge(name: string, desc = ""): Gauge {
    if (!this.gauges.has(name)) this.gauges.set(name, new Gauge(name, desc));
    return this.gauges.get(name)!;
  }

  histogram(name: string, desc = ""): Histogram {
    if (!this.histograms.has(name)) this.histograms.set(name, new Histogram(name, desc));
    return this.histograms.get(name)!;
  }

  collect(): Record<string, unknown> {
    return {
      counters: Object.fromEntries([...this.counters].map(([k, v]) => [k, v.value])),
      gauges: Object.fromEntries([...this.gauges].map(([k, v]) => [k, v.value])),
      histograms: Object.fromEntries([...this.histograms].map(([k, v]) => [k, v.stats])),
    };
  }
}

export const registry = new MetricsRegistry();
