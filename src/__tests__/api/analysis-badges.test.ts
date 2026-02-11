// ABOUTME: Tests for the batch latest-analysis badge fallback API.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analysis/badges/route";

function createRequest(symbols: string): NextRequest {
  const url = new URL("http://localhost:3000/api/analysis/badges");
  if (symbols) url.searchParams.set("symbols", symbols);
  return new NextRequest(url);
}

vi.mock("@/lib/supabase/server", () => {
  return {
    createAdminClient: vi.fn(() => {
      return {
        from: vi.fn((table: string) => {
          if (table !== "stock_analyses") {
            throw new Error(`Unexpected table: ${table}`);
          }

          const q = {
            select: vi.fn(),
            eq: vi.fn(),
            order: vi.fn(),
            limit: vi.fn(),
            maybeSingle: vi.fn(),
          };
          let symbol = "";

          q.select.mockImplementation(() => q);
          q.eq.mockImplementation((column: string, value: string) => {
            if (column === "symbol") symbol = String(value).toUpperCase();
            return q;
          });
          q.order.mockImplementation(() => q);
          q.limit.mockImplementation(() => q);
          q.maybeSingle.mockImplementation(async () => {
            if (symbol === "AAPL") {
              return {
                data: {
                  recommendation: "buy",
                  generated_at: "2026-02-11T00:00:00Z",
                },
                error: null,
              };
            }
            return { data: null, error: null };
          });

          return q;
        }),
      };
    }),
  };
});

describe("GET /api/analysis/badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns latest badge map for requested symbols", async () => {
    const res = await GET(createRequest("aapl,msft"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.badges.AAPL.recommendation).toBe("buy");
    expect(json.badges.AAPL.generatedAt).toBe("2026-02-11T00:00:00Z");
    expect(json.badges.MSFT).toBeUndefined();
  });

  it("returns empty map when symbols are missing", async () => {
    const res = await GET(createRequest(""));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.badges).toEqual({});
  });
});
