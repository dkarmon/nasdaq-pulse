// ABOUTME: Admin endpoint to refresh the daily top-25 AI badges based on a formula switch.
// ABOUTME: Generates Gemini analyses only for symbols newly entering the top-25 set (delta between formulas).

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Exchange } from "@/lib/market-data/types";
import { refreshDailyAiBadgesOnFormulaChange } from "@/lib/ai/daily-badges";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

function normalizeExchangeArray(value: unknown): Exchange[] {
  if (!Array.isArray(value) || value.length === 0) return ["nasdaq", "tlv"];
  const exchanges: Exchange[] = [];
  for (const v of value) {
    if (String(v).toLowerCase() === "tlv") exchanges.push("tlv");
    else if (String(v).toLowerCase() === "nasdaq") exchanges.push("nasdaq");
  }
  return exchanges.length > 0 ? exchanges : ["nasdaq", "tlv"];
}

function resolveFormulaIdForExchange(
  settings: {
    active_formula_id?: string | null;
    active_formula_nasdaq_id?: string | null;
    active_formula_tlv_id?: string | null;
  } | null,
  exchange: Exchange
): string | null {
  if (!settings) return null;
  if (exchange === "tlv") {
    return settings.active_formula_tlv_id ?? settings.active_formula_id ?? null;
  }
  return settings.active_formula_nasdaq_id ?? settings.active_formula_id ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const previousFormulaId = (body.previousFormulaId ?? null) as string | null;
  let newFormulaId = (body.newFormulaId ?? null) as string | null;
  const exchanges = normalizeExchangeArray(body.exchanges);

  if (!newFormulaId) {
    if (exchanges.length !== 1) {
      return NextResponse.json({ error: "newFormulaId is required when updating multiple exchanges" }, { status: 400 });
    }

    // Fall back to whichever formula is active for the requested exchange.
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from("recommendation_settings")
      .select("active_formula_id,active_formula_nasdaq_id,active_formula_tlv_id")
      .eq("id", true)
      .maybeSingle();
    newFormulaId = resolveFormulaIdForExchange(
      settings as {
        active_formula_id?: string | null;
        active_formula_nasdaq_id?: string | null;
        active_formula_tlv_id?: string | null;
      } | null,
      exchanges[0]
    );
  }

  if (!newFormulaId) {
    return NextResponse.json({ error: "newFormulaId is required" }, { status: 400 });
  }

  try {
    const result = await refreshDailyAiBadgesOnFormulaChange({
      previousFormulaId,
      newFormulaId,
      exchanges,
      trigger: "formula_change",
      timeBudgetMs: 240_000,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
