// ABOUTME: Supabase client for middleware usage.
// ABOUTME: Handles session refresh and cookie management in Next.js middleware.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to signin if not authenticated
  const isProtectedRoute =
    request.nextUrl.pathname.includes("/pulse") ||
    request.nextUrl.pathname.includes("/settings");

  if (isProtectedRoute && !user) {
    const locale = request.nextUrl.pathname.split("/")[1] || "en";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/signin`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
