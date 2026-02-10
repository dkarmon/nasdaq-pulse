// ABOUTME: Tests for the daily AI badges API route.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/daily-ai-badges/route";

function createRequest(exchange: string): NextRequest {
  const url = new URL("http://localhost:3000/api/daily-ai-badges");
  url.searchParams.set("exchange", exchange);
  return new NextRequest(url);
}

function chainSingle(data: any, error: any = null) {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error }));
  q.single = vi.fn(async () => ({ data, error }));
  return q;
}

function chainList(data: any[], error: any = null) {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.in = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.then = undefined;
  q.maybeSingle = vi.fn(async () => ({ data: null, error }));
  q.single = vi.fn(async () => ({ data: null, error }));
  q.delete = vi.fn(() => q);
  q.update = vi.fn(() => q);
  q.upsert = vi.fn(() => q);
  q.insert = vi.fn(() => q);
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.then = undefined;
  q._return = async () => ({ data, error });
  // For list selects, we just read `.select().eq()` and then await `.from()` call result via our mock's behavior.
  // Supabase-js returns a promise-like builder; in tests we return a plain object and read `.select()` without awaiting.
  return q;
}

vi.mock("@/lib/supabase/server", () => {
  return {
    createAdminClient: vi.fn(() => {
      return {
        from: vi.fn((table: string) => {
          if (table === "daily_ai_runs") {
            return chainSingle({
              id: "run1",
              formula_id: "f1",
              formula_version: 1,
              status: "ok",
              completed_at: null,
            });
          }
          if (table === "daily_ai_badges") {
            const q: any = {};
            q.select = vi.fn(() => q);
            q.eq = vi.fn(() => Promise.resolve({
              data: [
                { symbol: "AAPL", recommendation: "buy", generated_at: "2026-02-10T00:00:00Z", analysis_id: "a1" },
              ],
              error: null,
            }));
            return q;
          }
          return chainSingle(null);
        }),
      };
    }),
  };
});

describe("GET /api/daily-ai-badges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns today's badge map", async () => {
    const res = await GET(createRequest("nasdaq"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.exchange).toBe("nasdaq");
    expect(json.badges.AAPL.recommendation).toBe("buy");
    expect(json.badges.AAPL.analysisId).toBe("a1");
  });
});

