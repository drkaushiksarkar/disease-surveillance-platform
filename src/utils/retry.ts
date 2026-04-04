/**
 * Retry utilities with exponential backoff and jitter.
 * Provides configurable retry logic for transient failures.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 60000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (opts.retryOn && !opts.retryOn(lastError)) throw lastError;
      if (attempt === opts.maxAttempts) throw lastError;

      let delay = Math.min(opts.baseDelay * 2 ** (attempt - 1), opts.maxDelay);
      if (opts.jitter) delay *= 0.5 + Math.random();
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export class RetryBudget {
  private tokens: number;
  private lastRefill: number;

  constructor(private maxRate: number = 10) {
    this.tokens = maxRate;
    this.lastRefill = Date.now();
  }

  acquire(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxRate, this.tokens + elapsed * this.maxRate);
    this.lastRefill = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
