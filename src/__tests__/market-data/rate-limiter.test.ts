// ABOUTME: Tests for the rate limiter utility.
// ABOUTME: Verifies token bucket algorithm and daily limits.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRateLimiter } from "@/lib/market-data/rate-limiter";

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests up to the limit", () => {
    const limiter = createRateLimiter("test-provider", {
      requestsPerMinute: 5,
    });

    for (let i = 0; i < 5; i++) {
      expect(limiter.consumeToken()).toBe(true);
    }

    expect(limiter.consumeToken()).toBe(false);
  });

  it("refills tokens over time", () => {
    const limiter = createRateLimiter("test-provider-2", {
      requestsPerMinute: 5,
    });

    for (let i = 0; i < 5; i++) {
      limiter.consumeToken();
    }

    expect(limiter.canMakeRequest()).toBe(false);

    vi.advanceTimersByTime(60000);

    expect(limiter.canMakeRequest()).toBe(true);
  });

  it("respects daily limit", () => {
    const limiter = createRateLimiter("test-provider-3", {
      requestsPerMinute: 100,
      requestsPerDay: 3,
    });

    expect(limiter.consumeToken()).toBe(true);
    expect(limiter.consumeToken()).toBe(true);
    expect(limiter.consumeToken()).toBe(true);
    expect(limiter.consumeToken()).toBe(false);

    vi.advanceTimersByTime(60000);

    expect(limiter.canMakeRequest()).toBe(false);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(limiter.canMakeRequest()).toBe(true);
  });

  it("reports correct status", () => {
    const limiter = createRateLimiter("test-provider-4", {
      requestsPerMinute: 10,
      requestsPerDay: 100,
    });

    limiter.consumeToken();
    limiter.consumeToken();

    const status = limiter.getStatus();

    expect(status.provider).toBe("test-provider-4");
    expect(status.tokensRemaining).toBe(8);
    expect(status.dailyRemaining).toBe(98);
  });
});
