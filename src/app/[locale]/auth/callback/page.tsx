// ABOUTME: Client-side auth callback handler for Supabase Auth.
// ABOUTME: Handles both OAuth (code) and implicit (fragment) flows.

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing authentication...");
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const supabase = createClient();
    const next = searchParams.get("next") ?? "/en/pulse";

    const processUser = async (user: User) => {
      if (processedRef.current) return;
      processedRef.current = true;

      setStatus("Verifying access...");

      // Check if user already has a profile using RPC to avoid RLS timing issues
      const { data: result, error: rpcError } = await supabase
        .rpc("check_and_use_invitation", {
          user_email: user.email?.toLowerCase(),
          user_id: user.id,
          user_name: (user.user_metadata?.full_name || user.user_metadata?.name || null) as string | null,
          invited_role: (user.user_metadata?.invited_role as string) || "user",
        });

      console.log("Auth callback - RPC result:", { result, error: rpcError?.message });

      if (rpcError) {
        console.error("Auth callback - RPC error:", rpcError.message);

        // Check if this is a "user already exists" scenario
        // The RPC should handle this gracefully, but if not, check directly
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          // Profile exists, let them in
          setStatus("Redirecting...");
          router.push(next);
          return;
        }

        // Check if user was invited (has metadata from invite)
        const wasInvited = user.user_metadata?.invited_role || user.user_metadata?.invited_at;
        if (!wasInvited) {
          // Not invited - deny access
          console.log("Auth callback - Access denied: RPC failed and user not invited");
          await supabase.auth.signOut();
          router.push("/denied");
          return;
        }

        // User was invited but RPC failed - something unexpected
        console.error("Auth callback - Unexpected RPC failure for invited user");
        await supabase.auth.signOut();
        router.push("/denied");
        return;
      }

      // Success - redirect to app
      setStatus("Redirecting...");
      router.push(next);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth callback - auth state change:", event, session?.user?.email);

        if (event === "SIGNED_IN" && session?.user) {
          await processUser(session.user);
        }
      }
    );

    // Also check for existing session (handles page reload, PKCE callback, etc.)
    const checkExistingSession = async () => {
      // Give the client a moment to process URL fragments
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback - getSession error:", error.message);
        return;
      }

      if (session?.user && !processedRef.current) {
        await processUser(session.user);
      } else if (!session?.user) {
        // No session yet - wait a bit longer for implicit flow
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: { session: retrySession } } = await supabase.auth.getSession();

        if (retrySession?.user && !processedRef.current) {
          await processUser(retrySession.user);
        } else if (!processedRef.current) {
          console.error("Auth callback - no session after waiting");
          processedRef.current = true;
          router.push("/denied");
        }
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
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
