// ABOUTME: Tests for the daily AI badges API route.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/daily-ai-badges/route";

function createRequest(exchange: string): NextRequest {
  const url = new URL("http://localhost:3000/api/daily-ai-badges");
  url.searchParams.set("exchange", exchange);
  return new NextRequest(url);
}

type MockState = {
  todayRuns: any[];
  fallbackRuns: any[];
  badgesByRunId: Record<string, any[]>;
  todayRunsError?: string | null;
  fallbackRunsError?: string | null;
  badgesErrorByRunId?: Record<string, string>;
};

let mockState: MockState = {
  todayRuns: [],
  fallbackRuns: [],
  badgesByRunId: {},
  todayRunsError: null,
  fallbackRunsError: null,
  badgesErrorByRunId: {},
};

function runError(message: string | null | undefined) {
  return message ? { message } : null;
}

function chainDailyRuns() {
  const filters: Record<string, unknown> = {};
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn((key: string, value: unknown) => {
    filters[key] = value;
    return q;
  });
  q.in = vi.fn((key: string, value: unknown) => {
    filters[key] = value;
    return q;
  });
  q.order = vi.fn(() => q);
  q.limit = vi.fn(async () => {
    if (Object.prototype.hasOwnProperty.call(filters, "run_date")) {
      return { data: mockState.todayRuns, error: runError(mockState.todayRunsError) };
    }
    return { data: mockState.fallbackRuns, error: runError(mockState.fallbackRunsError) };
  });
  return q;
}

function chainBadges() {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn((key: string, value: unknown) => {
    if (key !== "run_id") return q;
    const runId = String(value);
    const data = mockState.badgesByRunId[runId] ?? [];
    const error = runError(mockState.badgesErrorByRunId?.[runId]);
    return Promise.resolve({ data, error });
  });
  return q;
}

vi.mock("@/lib/supabase/server", () => {
  return {
    createAdminClient: vi.fn(() => {
      return {
        from: vi.fn((table: string) => {
          if (table === "daily_ai_runs") {
            return chainDailyRuns();
          }
          if (table === "daily_ai_badges") {
            return chainBadges();
          }
          return chainDailyRuns();
        }),
      };
    }),
  };
});

describe("GET /api/daily-ai-badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      todayRuns: [],
      fallbackRuns: [],
      badgesByRunId: {},
      todayRunsError: null,
      fallbackRunsError: null,
      badgesErrorByRunId: {},
    };
  });

  it("returns today's badge map", async () => {
    mockState.todayRuns = [{
      id: "run-today",
      run_date: "2026-02-11",
      formula_id: "f1",
      status: "ok",
      completed_at: "2026-02-11T02:00:00Z",
      started_at: "2026-02-11T01:00:00Z",
      created_at: "2026-02-11T01:00:00Z",
    }];
    mockState.badgesByRunId = {
      "run-today": [
        { symbol: "AAPL", recommendation: "buy", generated_at: "2026-02-11T00:00:00Z", analysis_id: "a1" },
      ],
    };

    const res = await GET(createRequest("nasdaq"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.exchange).toBe("nasdaq");
    expect(json.badges.AAPL.recommendation).toBe("buy");
    expect(json.badges.AAPL.analysisId).toBe("a1");
  });

  it("falls back to latest successful run when today's run is missing", async () => {
    mockState.fallbackRuns = [{
      id: "run-old",
      run_date: "2026-02-10",
      formula_id: "f1",
      status: "ok",
      completed_at: "2026-02-10T03:00:00Z",
      started_at: "2026-02-10T02:00:00Z",
      created_at: "2026-02-10T02:00:00Z",
    }];
    mockState.badgesByRunId = {
      "run-old": [
        { symbol: "MSFT", recommendation: "hold", generated_at: "2026-02-10T01:00:00Z", analysis_id: "a2" },
      ],
    };

    const res = await GET(createRequest("nasdaq"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.runDate).toBe("2026-02-10");
    expect(json.badges.MSFT.recommendation).toBe("hold");
  });

  it("uses another available today run when one has no badges", async () => {
    mockState.todayRuns = [
      {
        id: "run-empty",
        run_date: "2026-02-11",
        formula_id: "f1",
        status: "ok",
        completed_at: "2026-02-11T03:00:00Z",
        started_at: "2026-02-11T02:00:00Z",
        created_at: "2026-02-11T02:00:00Z",
      },
      {
        id: "run-with-badges",
        run_date: "2026-02-11",
        formula_id: "f1",
        status: "partial",
        completed_at: "2026-02-11T01:00:00Z",
        started_at: "2026-02-11T00:00:00Z",
        created_at: "2026-02-11T00:00:00Z",
      },
    ];
    mockState.badgesByRunId = {
      "run-empty": [],
      "run-with-badges": [
        { symbol: "NVDA", recommendation: "buy", generated_at: "2026-02-11T00:30:00Z", analysis_id: "a3" },
      ],
    };

    const res = await GET(createRequest("nasdaq"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.badges.NVDA.recommendation).toBe("buy");
    expect(json.status).toBe("partial");
  });
});
