import { BaseError, ValidationError, SchemaError, SourceUnavailableError, StageError, InferenceError } from "../src/utils/exceptions";

describe("BaseError", () => {
  it("serializes to JSON", () => {
    const err = new BaseError("test", "TEST_ERR", { key: "val" });
    const json = err.toJSON();
    expect(json.error).toBe("TEST_ERR");
    expect(json.context).toEqual({ key: "val" });
    expect(json.retryable).toBe(false);
  });
});

describe("ValidationError", () => {
  it("includes field in message", () => {
    const err = new ValidationError("iso3", "invalid");
    expect(err.message).toContain("iso3");
  });
});

describe("SourceUnavailableError", () => {
  it("is retryable", () => {
    const err = new SourceUnavailableError("WHO", "timeout");
    expect(err.retryable).toBe(true);
  });
});

describe("InferenceError", () => {
  it("includes model context", () => {
    const err = new InferenceError("sage-72b", "OOM");
    expect(err.context.modelId).toBe("sage-72b");
    expect(err.retryable).toBe(true);
  });
});
