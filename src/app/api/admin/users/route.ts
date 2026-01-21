// ABOUTME: Admin API for managing user profiles.
// ABOUTME: Supports GET (list users) and PATCH (update user role) operations.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Use the database function to bypass RLS issues with auth.uid()
  const { data: users, error } = await supabase
    .rpc("get_users_for_admin", { admin_user_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, role } = await request.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Use the database function to bypass RLS issues with auth.uid()
  const { data: success, error } = await supabase
    .rpc("update_user_role_for_admin", {
      admin_user_id: user.id,
      target_user_id: userId,
      new_role: role,
    });

  if (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (error.message === "Cannot change own role") {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
