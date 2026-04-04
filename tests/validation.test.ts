import { validateIso3, validateYear, validateCompleteness, Severity } from "../src/utils/validation";

describe("validateIso3", () => {
  it("accepts valid ISO3", () => { expect(validateIso3("USA")).toBeNull(); });
  it("rejects lowercase", () => { expect(validateIso3("usa")?.severity).toBe(Severity.Error); });
  it("rejects short", () => { expect(validateIso3("US")?.severity).toBe(Severity.Error); });
  it("rejects number", () => { expect(validateIso3(123)?.severity).toBe(Severity.Error); });
});

describe("validateYear", () => {
  it("accepts valid year", () => { expect(validateYear(2024)).toBeNull(); });
  it("rejects too old", () => { expect(validateYear(1800)?.severity).toBe(Severity.Error); });
  it("rejects string", () => { expect(validateYear("2024" as any)?.severity).toBe(Severity.Error); });
});

describe("validateCompleteness", () => {
  it("passes for complete data", () => {
    const records = Array(100).fill({ iso3: "BGD", year: 2024, value: 1 });
    const report = validateCompleteness(records, ["iso3", "year", "value"]);
    expect(report.passed).toBe(true);
  });

  it("fails for empty dataset", () => {
    const report = validateCompleteness([], ["iso3"]);
    expect(report.passed).toBe(false);
  });

  it("fails for incomplete field", () => {
    const records = Array(100).fill({ iso3: "BGD", year: 2024 });
    const report = validateCompleteness(records, ["iso3", "year", "value"], 0.95);
    expect(report.passed).toBe(false);
  });
});
