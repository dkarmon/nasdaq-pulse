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

    // Wait for cookies to be set (Supabase calls setAll asynchronously)
    await Promise.race([
      cookiesSetPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    if (!error && cookiesToSet.length > 0 && data.user) {
      const user = data.user;
      const userEmail = user.email?.toLowerCase();

      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        // New user - check if they're allowed
        // 1. Check if they have an invitation
        const { data: invitation } = await supabase
          .from("invitations")
          .select("id, role")
          .eq("email", userEmail)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();

        // 2. Check if any admin exists (first user becomes admin)
        const { data: adminExists } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .limit(1)
          .single();

        if (!invitation && adminExists) {
          // No invitation and admin exists - deny access
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/denied`);
        }

        // Create profile for new user
        // First user becomes admin, otherwise use invitation role or default to user
        const role = !adminExists ? "admin" : (invitation?.role || "user");
        await supabase.from("profiles").insert({
          id: user.id,
          email: userEmail,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          role,
        });

        // Mark invitation as used if exists
        if (invitation) {
          await supabase
            .from("invitations")
            .update({ used_at: new Date().toISOString() })
            .eq("id", invitation.id);
        }
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
