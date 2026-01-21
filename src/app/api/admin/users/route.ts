// ABOUTME: Admin API for managing user profiles.
// ABOUTME: Supports GET (list), PATCH (update role), and DELETE (remove) operations.

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Delete from profiles via RPC
  const { error: profileError } = await supabase
    .rpc("delete_user_for_admin", {
      admin_user_id: user.id,
      target_user_id: userId,
    });

  if (profileError) {
    if (profileError.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (profileError.message === "Cannot delete yourself") {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }
    if (profileError.message === "Cannot delete admin users") {
      return NextResponse.json({ error: "Cannot delete admin users" }, { status: 400 });
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Also delete from Supabase Auth
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Failed to delete user from auth:", authError.message);
    // Don't fail - profile is already deleted
  }

  return NextResponse.json({ success: true });
}
