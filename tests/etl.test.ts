import { Pipeline, StageStatus } from "../src/pipelines/etl";
import { normalizeIso3, filterNulls, deduplicate, clipValues } from "../src/pipelines/transforms";

describe("Pipeline", () => {
  it("runs stages in order", () => {
    const result = new Pipeline("test")
      .addStage("double", (data: number[]) => data.map((x) => x * 2))
      .addStage("filter", (data: number[]) => data.filter((x) => x > 5))
      .execute([1, 2, 3, 4, 5]);
    expect(result.success).toBe(true);
    expect(result.stages).toHaveLength(2);
  });

  it("halts on failure", () => {
    const result = new Pipeline("test")
      .addStage("fail", () => { throw new Error("boom"); })
      .addStage("never", (d: unknown[]) => d)
      .execute([1]);
    expect(result.success).toBe(false);
    expect(result.stages).toHaveLength(1);
  });
});

describe("transforms", () => {
  it("normalizes ISO3", () => {
    expect(normalizeIso3([{ iso3: "bgd" }])[0].iso3).toBe("BGD");
  });
  it("filters nulls", () => {
    expect(filterNulls([{ a: 1 }, { a: null }], ["a"])).toHaveLength(1);
  });
  it("deduplicates", () => {
    expect(deduplicate([{ k: "a" }, { k: "a" }, { k: "b" }], ["k"])).toHaveLength(2);
  });
  it("clips values", () => {
    expect(clipValues([{ v: -5 }, { v: 50 }, { v: 150 }], "v", 0, 100)[2].v).toBe(100);
  });
});
