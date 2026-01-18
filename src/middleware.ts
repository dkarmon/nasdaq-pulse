export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/en/pulse/:path*", "/he/pulse/:path*", "/api/stocks/:path*", "/api/news/:path*"],
};
