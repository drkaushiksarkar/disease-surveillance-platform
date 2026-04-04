import { Counter, Gauge, Histogram, MetricsRegistry } from "../src/utils/metrics";

describe("Counter", () => {
  it("starts at zero", () => { expect(new Counter("c").value).toBe(0); });
  it("increments", () => { const c = new Counter("c"); c.inc(5); expect(c.value).toBe(5); });
});

describe("Gauge", () => {
  it("sets value", () => { const g = new Gauge("g"); g.set(42); expect(g.value).toBe(42); });
  it("increments and decrements", () => {
    const g = new Gauge("g"); g.inc(5); g.dec(2); expect(g.value).toBe(3);
  });
});

describe("Histogram", () => {
  it("observes values", () => {
    const h = new Histogram("h"); h.observe(0.5); h.observe(1.5);
    expect(h.stats.count).toBe(2); expect(h.stats.sum).toBe(2.0);
  });
});

describe("MetricsRegistry", () => {
  it("creates and collects metrics", () => {
    const reg = new MetricsRegistry();
    reg.counter("c1").inc(3);
    reg.gauge("g1").set(7);
    const data = reg.collect();
    expect(data.counters.c1).toBe(3);
    expect(data.gauges.g1).toBe(7);
  });
});
