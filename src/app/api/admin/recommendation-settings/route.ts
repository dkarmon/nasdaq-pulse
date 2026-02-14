// ABOUTME: Admin endpoint to read/update recommendation settings (active formula).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchActiveFormula,
  setActiveFormula,
  summarizeFormula,
} from "@/lib/recommendations/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Exchange } from "@/lib/market-data/types";

function parseExchange(value: unknown): Exchange {
  return String(value).toLowerCase() === "tlv" ? "tlv" : "nasdaq";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [activeFormulaNasdaq, activeFormulaTlv] = await Promise.all([
    fetchActiveFormula("nasdaq", { fallbackToDefault: true }),
    fetchActiveFormula("tlv", { fallbackToDefault: true }),
  ]);

  return NextResponse.json({
    // Compatibility alias for older clients that still expect a single activeFormula.
    activeFormula: summarizeFormula(activeFormulaNasdaq ?? null),
    activeFormulaNasdaq: summarizeFormula(activeFormulaNasdaq ?? null),
    activeFormulaTlv: summarizeFormula(activeFormulaTlv ?? null),
    activeFormulas: {
      nasdaq: summarizeFormula(activeFormulaNasdaq ?? null),
      tlv: summarizeFormula(activeFormulaTlv ?? null),
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const exchange = parseExchange(body.exchange);
  const activeFormulaId = body.activeFormulaId as string | undefined;

  if (!activeFormulaId) {
    return NextResponse.json({ error: "activeFormulaId is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: before } = await admin
      .from("recommendation_settings")
      .select("active_formula_id,active_formula_nasdaq_id,active_formula_tlv_id")
      .eq("id", true)
      .maybeSingle();

    const previousActiveFormulaId = (
      exchange === "tlv"
        ? before?.active_formula_tlv_id ?? before?.active_formula_id
        : before?.active_formula_nasdaq_id ?? before?.active_formula_id
    ) as string | null;

    const result = await setActiveFormula(exchange, activeFormulaId, user.id);
    return NextResponse.json({
      ...result,
      previousActiveFormulaId,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
