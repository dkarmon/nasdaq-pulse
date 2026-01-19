import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const allowedEmails =
  process.env.ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

export const authConfig: NextAuthConfig = {
  adapter: UpstashRedisAdapter(redis),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@resend.dev",
    }),
  ],
  pages: {
    error: "/denied",
    verifyRequest: "/verify-request",
  },
  callbacks: {
    async signIn({ user, profile }) {
      // Get email from user (magic link) or profile (OAuth)
      const email = (user?.email ?? profile?.email ?? "").toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
    async jwt({ token, user, profile }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
      } else if (profile?.email) {
        token.email = profile.email.toString().toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.email && session?.user) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
