// ABOUTME: OAuth callback handler for Supabase Auth.
// ABOUTME: Exchanges auth code for session and redirects to the app.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en/pulse";

  if (code) {
    // Collect cookies to set on the response
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
    let cookiesSetResolve: () => void;
    const cookiesSetPromise = new Promise<void>((resolve) => {
      cookiesSetResolve = resolve;
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader.split(";").map((cookie) => {
              const [name, ...rest] = cookie.trim().split("=");
              return { name, value: rest.join("=") };
            }).filter((c) => c.name);
          },
          setAll(cookies) {
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
            cookiesSetResolve();
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("Auth callback - code exchange result:", {
      hasUser: !!data.user,
      userId: data.user?.id,
      email: data.user?.email,
      error: error?.message
    });

    if (!error && data.user) {
      // Wait for cookies to be set (Supabase calls setAll asynchronously)
      await Promise.race([
        cookiesSetPromise,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      const user = data.user;
      const userEmail = user.email?.toLowerCase();
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || null;

      // Use RPC function to check invitation and create profile
      // This bypasses RLS issues with auth.uid() on Vercel
      const { data: result, error: rpcError } = await supabase
        .rpc("check_and_use_invitation", {
          user_email: userEmail,
          user_id: user.id,
          user_name: userName,
        });

      console.log("Auth callback - RPC result:", { result, rpcError: rpcError?.message });

      if (rpcError) {
        console.error("RPC error:", rpcError.message);
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/denied`);
      }

      if (result?.status === "denied") {
        console.log("Auth callback - Access denied by RPC");
        // No invitation and admin exists - deny access
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/denied`);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      let redirectUrl: string;
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      } else {
        redirectUrl = `${origin}${next}`;
      }

      // Create redirect response and add session cookies
      const response = NextResponse.redirect(redirectUrl);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/denied`);
}
