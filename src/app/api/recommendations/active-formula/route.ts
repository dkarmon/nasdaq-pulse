// ABOUTME: Public endpoint returning the currently active recommendation formula.
// ABOUTME: Falls back to the seeded default when no published formula is active.

import { NextResponse } from "next/server";
import {
  fetchActiveFormula,
  getDefaultFormula,
  summarizeFormula,
} from "@/lib/recommendations/server";
import type { Exchange } from "@/lib/market-data/types";

function parseExchange(value: string | null): Exchange {
  return value?.toLowerCase() === "tlv" ? "tlv" : "nasdaq";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const exchange = parseExchange(url.searchParams.get("exchange"));
    const formula = await fetchActiveFormula(exchange, { fallbackToDefault: true });
    const summary = summarizeFormula(formula ?? getDefaultFormula());
    return NextResponse.json({ formula: summary });
  } catch (error) {
    console.error("Failed to load active formula", error);
    return NextResponse.json({ error: "Unable to load active formula" }, { status: 500 });
  }
}
