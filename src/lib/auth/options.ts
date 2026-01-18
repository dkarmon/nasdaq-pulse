import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails =
  process.env.ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    error: "/denied",
  },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email ?? "").toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
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
  session: {
    strategy: "jwt",
  },
};
