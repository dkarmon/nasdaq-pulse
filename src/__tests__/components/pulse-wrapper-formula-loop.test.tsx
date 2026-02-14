// ABOUTME: Guards against a callback-driven render loop between PulseWrapper and ScreenerClient.
// ABOUTME: Ensures unchanged formula updates do not retrigger repeated fetch cycles.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { ScreenerResponse } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import { PulseWrapper } from "@/app/[locale]/pulse/components/pulse-wrapper";

let effectRuns = 0;

vi.mock("@/app/[locale]/pulse/components/screener-client", async () => {
  const React = await import("react");

  return {
    ScreenerClient: ({
      onFormulaChange,
    }: {
      onFormulaChange: (
        exchange: "nasdaq" | "tlv",
        formula: {
          id: string;
          name: string;
          description: null;
          expression: string;
          status: "draft" | "published" | "archived";
          version: number;
          updatedAt: string;
        } | null
      ) => void;
    }) => {
      React.useEffect(() => {
        effectRuns += 1;
        onFormulaChange("nasdaq", {
          id: "formula-1",
          name: "Formula 1",
          description: null,
          expression: "growth1m",
          status: "published",
          version: 1,
          updatedAt: "2026-02-14T00:00:00.000Z",
        });
      }, [onFormulaChange]);

      return React.createElement("div", null, "mock-screener");
    },
  };
});

vi.mock("@/app/[locale]/pulse/components/stock-detail", () => ({
  StockDetail: () => null,
}));

const mockInitialData: ScreenerResponse = {
  stocks: [],
  updatedAt: new Date().toISOString(),
  source: "cached",
  exchange: "nasdaq",
};

const mockDict = {
  screener: {
    backToList: "",
    price: "",
    growth1d: "",
    growth5d: "",
    growth1m: "",
    growth6m: "",
    growth12m: "",
    pe: "",
    week52Range: "",
    latestNews: "",
    noNews: "",
    viewAllNews: "",
    live: "",
    loading: "",
    error: "",
    recommended: "",
    sector: "",
    industry: "",
    marketCap: "",
    companyOverview: "",
    website: "",
  },
  aiAnalysis: {},
} as unknown as Dictionary;

describe("PulseWrapper formula update behavior", () => {
  beforeEach(() => {
    effectRuns = 0;
  });

  it("does not loop when ScreenerClient reuses the same formula", async () => {
    render(
      <PulseWrapper
        initialData={mockInitialData}
        dict={mockDict}
        locale="en"
        isAdmin={false}
        navContent={null}
      />
    );

    await waitFor(() => {
      expect(effectRuns).toBe(1);
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(effectRuns).toBe(1);
  });
});
