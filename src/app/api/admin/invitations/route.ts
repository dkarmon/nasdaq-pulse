// ABOUTME: Admin API for managing user invitations.
// ABOUTME: Supports GET (list), POST (create), and DELETE (remove) operations.

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Use the database function to bypass RLS issues with auth.uid()
  const { data: invitations, error } = await supabase
    .rpc("get_invitations_for_admin", { user_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitations: invitations || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, role = "user" } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Use the database function to bypass RLS issues with auth.uid()
  const { data: invitation, error } = await supabase
    .rpc("create_invitation_for_admin", {
      admin_user_id: user.id,
      invite_email: email,
      invite_role: role,
    });

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Email already invited" }, { status: 409 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send invitation email using Supabase Auth
  const adminClient = createAdminClient();
  const origin = request.headers.get("origin") || "https://nasdaq-pulse.vercel.app";

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      redirectTo: `${origin}/en/auth/callback?next=/en/pulse`,
      data: {
        invited_role: role,
        invited_at: new Date().toISOString(),
      },
    }
  );

  if (inviteError) {
    // Log but don't fail - the invitation record is created, email just didn't send
    console.error("Failed to send invitation email:", inviteError.message);
  }

  return NextResponse.json({ invitation });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Use the database function to bypass RLS issues with auth.uid()
  const { data: success, error } = await supabase
    .rpc("delete_invitation_for_admin", {
      user_id: user.id,
      invitation_id: id,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
