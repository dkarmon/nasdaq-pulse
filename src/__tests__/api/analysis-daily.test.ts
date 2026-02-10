// ABOUTME: Tests for preferring today's daily analysis in GET /api/analysis/[symbol].

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function createRequest(symbol: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000/api/analysis/${symbol}`));
}

function chainMaybeSingle(data: any) {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.gte = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error: null }));
  q.single = vi.fn(async () => ({ data, error: null }));
  return q;
}

describe("GET /api/analysis/[symbol]", () => {
  beforeEach(() => vi.resetModules());

  it("returns daily analysis when a daily badge exists", async () => {
    vi.doMock("@/lib/supabase/server", () => {
      return {
        createClient: vi.fn(async () => {
          return {
            from: (table: string) => {
              if (table === "daily_ai_runs") {
                return chainMaybeSingle({ id: "run1" });
              }
              if (table === "daily_ai_badges") {
                const q: any = {};
                q.select = vi.fn(() => q);
                q.eq = vi.fn(() => q);
                q.maybeSingle = vi.fn(async () => ({ data: { analysis_id: "analysis1" }, error: null }));
                return q;
              }
              if (table === "stock_analyses") {
                const q: any = {};
                q.select = vi.fn(() => q);
                q.eq = vi.fn(() => q);
                q.single = vi.fn(async () => ({
                  data: {
                    id: "analysis1",
                    symbol: "AAPL",
                    recommendation: "buy",
                    analysis_en: "en",
                    analysis_he: "he",
                    news_sources: [],
                    news_count: 0,
                    model_version: "gemini",
                    generated_at: "2026-02-10T01:00:00Z",
                  },
                  error: null,
                }));
                q.order = vi.fn(() => q);
                q.limit = vi.fn(() => q);
                return q;
              }
              return chainMaybeSingle(null);
            },
          };
        }),
      };
    });

    const { GET } = await import("@/app/api/analysis/[symbol]/route");
    const req = createRequest("AAPL");
    const res = await GET(req as any, { params: Promise.resolve({ symbol: "AAPL" }) } as any);
    const json = await res.json();
    expect(json.meta.source).toBe("daily");
    expect(json.analysis.id).toBe("analysis1");
  });

  it("falls back to latest analysis when no daily badge exists", async () => {
    vi.doMock("@/lib/supabase/server", () => {
      return {
        createClient: vi.fn(async () => {
          return {
            from: (table: string) => {
              if (table === "daily_ai_runs") {
                return chainMaybeSingle(null);
              }
              if (table === "stock_analyses") {
                const q: any = {};
                q.select = vi.fn(() => q);
                q.eq = vi.fn(() => q);
                q.order = vi.fn(() => q);
                q.limit = vi.fn(() => q);
                q.single = vi.fn(async () => ({
                  data: {
                    id: "analysis2",
                    symbol: "AAPL",
                    recommendation: "hold",
                    analysis_en: "en2",
                    analysis_he: "he2",
                    news_sources: [],
                    news_count: 0,
                    model_version: "gemini",
                    generated_at: "2026-02-09T01:00:00Z",
                  },
                  error: null,
                }));
                return q;
              }
              return chainMaybeSingle(null);
            },
          };
        }),
      };
    });

    const { GET } = await import("@/app/api/analysis/[symbol]/route");
    const req = createRequest("AAPL");
    const res = await GET(req as any, { params: Promise.resolve({ symbol: "AAPL" }) } as any);
    const json = await res.json();
    expect(json.meta.source).toBe("latest");
    expect(json.analysis.id).toBe("analysis2");
  });
});
