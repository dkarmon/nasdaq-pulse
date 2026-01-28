// ABOUTME: Admin API for managing default omit rules.
// ABOUTME: GET returns current admin omit rules, PATCH updates them.

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { OmitRulesConfig } from "@/lib/market-data/types";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: settings, error } = await adminClient
    .from("recommendation_settings")
    .select("omit_rules")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    omitRules: (settings?.omit_rules as OmitRulesConfig | null) ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const omitRules = body.omitRules as OmitRulesConfig | null;

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("recommendation_settings")
    .upsert({
      id: true,
      omit_rules: omitRules,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, omitRules });
}
