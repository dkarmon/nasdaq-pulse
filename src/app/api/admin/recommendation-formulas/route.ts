// ABOUTME: Admin endpoint for listing and creating recommendation formulas.
// ABOUTME: Write operations rely on Supabase RLS to enforce admin role.

import { NextResponse } from "next/server";
import { listFormulas, createFormula } from "@/lib/recommendations/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as any;

  try {
    const formulas = await listFormulas({ status: status || undefined });
    return NextResponse.json({ formulas });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, expression, status, notes } = body;

  if (!name || !expression) {
    return NextResponse.json({ error: "Name and expression are required" }, { status: 400 });
  }

  try {
    const formula = await createFormula(
      { name, description, expression, status, notes },
      user.id
    );
    return NextResponse.json({ formula });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
