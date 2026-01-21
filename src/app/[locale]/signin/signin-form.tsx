// ABOUTME: Client-side sign-in form component with Google OAuth and magic link.
// ABOUTME: Handles Supabase Auth interactions for the signin page.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";
import styles from "./signin.module.css";

type SignInFormProps = {
  locale: string;
  dict: Dictionary;
};

export function SignInForm({ locale, dict }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/pulse`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/pulse`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(dict.auth.checkEmail || "Check your email for the login link!");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className={styles.googleButton}
      >
        <GoogleIcon />
        {dict.auth.googleButton}
      </button>

      <div className={styles.divider}>
        <span>{dict.auth.or}</span>
      </div>

      <form onSubmit={handleMagicLink} className={styles.emailForm}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.auth.emailPlaceholder}
          required
          disabled={loading}
          className={styles.emailInput}
        />
        <button type="submit" disabled={loading} className={styles.emailButton}>
          {loading ? "..." : dict.auth.emailButton}
        </button>
      </form>

      {message && <p className={styles.message}>{message}</p>}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
