// ABOUTME: API for user preferences CRUD operations.
// ABOUTME: Syncs preferences between client and Supabase.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: prefs, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (not an error, just no prefs yet)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: prefs || null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sort_by, display_limit, filters, exchange, hidden_symbols, show_recommended_only, omit_rules } = body;

  // Upsert preferences
  const { data: prefs, error } = await supabase
    .from("user_preferences")
    .upsert({
      user_id: user.id,
      sort_by,
      display_limit,
      filters,
      exchange,
      hidden_symbols,
      show_recommended_only,
      omit_rules,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: prefs });
}
