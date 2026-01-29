// ABOUTME: Rate limiter for API providers to stay within free tier limits.
// ABOUTME: Implements token bucket algorithm with per-provider configuration.

type RateLimiterConfig = {
  requestsPerMinute: number;
  requestsPerDay?: number;
};

type RateLimiterState = {
  tokens: number;
  lastRefill: number;
  dailyCount: number;
  dailyReset: number;
};

const state = new Map<string, RateLimiterState>();

export function createRateLimiter(provider: string, config: RateLimiterConfig) {
  const getState = (): RateLimiterState => {
    const now = Date.now();
    const existing = state.get(provider);

    if (!existing) {
      const newState: RateLimiterState = {
        tokens: config.requestsPerMinute,
        lastRefill: now,
        dailyCount: 0,
        dailyReset: now + 24 * 60 * 60 * 1000,
      };
      state.set(provider, newState);
      return newState;
    }

    const elapsed = now - existing.lastRefill;
    const minutesPassed = elapsed / 60000;
    const tokensToAdd = Math.floor(minutesPassed * config.requestsPerMinute);

    if (tokensToAdd > 0) {
      existing.tokens = Math.min(
        config.requestsPerMinute,
        existing.tokens + tokensToAdd
      );
      existing.lastRefill = now;
    }

    if (now >= existing.dailyReset) {
      existing.dailyCount = 0;
      existing.dailyReset = now + 24 * 60 * 60 * 1000;
    }

    return existing;
  };

  const canMakeRequest = (): boolean => {
    const s = getState();

    if (s.tokens <= 0) {
      return false;
    }

    if (config.requestsPerDay && s.dailyCount >= config.requestsPerDay) {
      return false;
    }

    return true;
  };

  const consumeToken = (): boolean => {
    if (!canMakeRequest()) {
      return false;
    }

    const s = getState();
    s.tokens -= 1;
    s.dailyCount += 1;
    return true;
  };

  const getStatus = () => {
    const s = getState();
    return {
      provider,
      tokensRemaining: s.tokens,
      dailyRemaining: config.requestsPerDay
        ? config.requestsPerDay - s.dailyCount
        : undefined,
      resetIn: Math.max(0, 60000 - (Date.now() - s.lastRefill)),
    };
  };

  const waitForToken = async (
    timeoutMs: number = 60000
  ): Promise<boolean> => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (consumeToken()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  };

  return {
    canMakeRequest,
    consumeToken,
    getStatus,
    waitForToken,
  };
}

export const finnhubLimiter = createRateLimiter("finnhub", {
  requestsPerMinute: 60,
});

export const newsApiLimiter = createRateLimiter("newsApi", {
  requestsPerMinute: 10,
  requestsPerDay: 100,
});
