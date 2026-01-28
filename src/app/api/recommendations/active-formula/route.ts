// ABOUTME: Public endpoint returning the currently active recommendation formula.
// ABOUTME: Falls back to the seeded default when no published formula is active.

import { NextResponse } from "next/server";
import {
  fetchActiveFormula,
  getDefaultFormula,
  summarizeFormula,
} from "@/lib/recommendations/server";

export async function GET() {
  try {
    const formula = await fetchActiveFormula({ fallbackToDefault: true });
    const summary = summarizeFormula(formula ?? getDefaultFormula());
    return NextResponse.json({ formula: summary });
  } catch (error) {
    console.error("Failed to load active formula", error);
    return NextResponse.json({ error: "Unable to load active formula" }, { status: 500 });
  }
}
