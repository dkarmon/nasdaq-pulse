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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // Wait for cookies to be set (Supabase calls setAll asynchronously)
    await Promise.race([
      cookiesSetPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    if (!error && cookiesToSet.length > 0) {
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
