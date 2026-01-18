import { withAuth } from "next-auth/middleware";

const allowedEmails =
  process.env.ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      const email = (token?.email ?? "").toString().toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
  },
  pages: {
    signIn: "/api/auth/signin",
  },
});

export const config = {
  matcher: ["/((en|he))/pulse/:path*", "/api/(stocks|news)(.*)"],
};
