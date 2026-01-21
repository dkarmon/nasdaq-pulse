// ABOUTME: Client-side auth callback handler for Supabase Auth.
// ABOUTME: Handles both OAuth (code) and implicit (fragment) flows.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/en/pulse";

      try {
        // Get the current session - this handles both:
        // 1. OAuth code exchange (PKCE flow)
        // 2. Token extraction from URL fragment (implicit flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback - session error:", sessionError.message);
          router.push("/denied");
          return;
        }

        if (!session?.user) {
          // No session yet - might need to wait for fragment processing
          // The Supabase client should auto-detect fragments
          // Wait a moment and try again
          await new Promise((resolve) => setTimeout(resolve, 500));

          const { data: { session: retrySession } } = await supabase.auth.getSession();

          if (!retrySession?.user) {
            console.error("Auth callback - no session after retry");
            router.push("/denied");
            return;
          }

          // Continue with retry session
          await processUser(supabase, retrySession.user, next);
          return;
        }

        await processUser(supabase, session.user, next);
      } catch (error) {
        console.error("Auth callback - unexpected error:", error);
        router.push("/denied");
      }
    };

    const processUser = async (
      supabase: ReturnType<typeof createClient>,
      user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
      next: string
    ) => {
      setStatus("Verifying access...");

      // Check if user already has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Existing user - let them in
        setStatus("Redirecting...");
        router.push(next);
        return;
      }

      // No profile - check if they were invited
      const invitedRole = user.user_metadata?.invited_role as string | undefined;
      const wasInvited = invitedRole || user.user_metadata?.invited_at;

      if (!wasInvited) {
        // Not invited - check if first user (becomes admin)
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (count && count > 0) {
          // Other users exist, this person isn't invited
          console.log("Auth callback - Access denied: not invited and not first user");
          await supabase.auth.signOut();
          router.push("/denied");
          return;
        }
      }

      // Create profile via RPC
      const userEmail = user.email?.toLowerCase();
      const userName = (user.user_metadata?.full_name || user.user_metadata?.name || null) as string | null;

      const { data: result, error: rpcError } = await supabase
        .rpc("check_and_use_invitation", {
          user_email: userEmail,
          user_id: user.id,
          user_name: userName,
          invited_role: invitedRole || "user",
        });

      console.log("Auth callback - RPC result:", { result, rpcError: rpcError?.message });

      if (rpcError) {
        console.error("RPC error:", rpcError.message);
        await supabase.auth.signOut();
        router.push("/denied");
        return;
      }

      // Success - redirect to app
      setStatus("Redirecting...");
      router.push(next);
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e5e7eb",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }} />
        <p style={{ color: "#6b7280" }}>{status}</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
