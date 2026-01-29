// ABOUTME: Returns user's effective omit rules.
// ABOUTME: Uses user's custom rules if sync is off, otherwise falls back to admin defaults.

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { OmitRulesConfig, UserOmitPrefs } from "@/lib/market-data/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user preferences
  const { data: userPrefs } = await supabase
    .from("user_preferences")
    .select("omit_rules")
    .eq("user_id", user.id)
    .maybeSingle();

  const userOmitPrefs = userPrefs?.omit_rules as UserOmitPrefs | null;

  // If user has sync off and custom rules, use those
  if (userOmitPrefs && !userOmitPrefs.syncWithAdmin && userOmitPrefs.customRules) {
    return NextResponse.json({
      omitRules: userOmitPrefs.customRules,
      source: "user",
    });
  }

  // Otherwise, fetch admin defaults
  const adminClient = createAdminClient();
  const { data: settings } = await adminClient
    .from("recommendation_settings")
    .select("omit_rules")
    .eq("id", true)
    .maybeSingle();

  const adminRules = settings?.omit_rules as OmitRulesConfig | null;

  return NextResponse.json({
    omitRules: adminRules,
    source: "admin",
  });
}
