import { withRetry, RetryBudget } from "../src/utils/retry";

describe("withRetry", () => {
  it("succeeds on first attempt", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error", async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "recovered";
    });
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 });
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("throws after max attempts", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("permanent"));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("RetryBudget", () => {
  it("acquires within budget", () => {
    const budget = new RetryBudget(10);
    expect(budget.acquire()).toBe(true);
  });

  it("exhausts budget", () => {
    const budget = new RetryBudget(1);
    budget.acquire();
    expect(budget.acquire()).toBe(false);
  });
});
