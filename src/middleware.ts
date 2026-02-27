// ABOUTME: Next.js middleware for Supabase Auth session management.
// ABOUTME: Protects routes and refreshes auth tokens automatically.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/en/signin",
    "/he/signin",
    "/en/pulse/:path*",
    "/he/pulse/:path*",
    "/en/settings/:path*",
    "/he/settings/:path*",
    "/api/news/:path*",
  ],
};
