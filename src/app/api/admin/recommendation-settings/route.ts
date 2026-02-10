// ABOUTME: Admin endpoint to read/update recommendation settings (active formula).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchActiveFormula,
  setActiveFormula,
  summarizeFormula,
} from "@/lib/recommendations/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const activeFormula = await fetchActiveFormula({ fallbackToDefault: true });
  return NextResponse.json({
    activeFormula: summarizeFormula(activeFormula ?? null),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const activeFormulaId = body.activeFormulaId as string | undefined;

  if (!activeFormulaId) {
    return NextResponse.json({ error: "activeFormulaId is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: before } = await admin
      .from("recommendation_settings")
      .select("active_formula_id")
      .eq("id", true)
      .maybeSingle();

    const previousActiveFormulaId = (before?.active_formula_id as string | null) ?? null;

    const result = await setActiveFormula(activeFormulaId, user.id);
    return NextResponse.json({
      ...result,
      previousActiveFormulaId,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
