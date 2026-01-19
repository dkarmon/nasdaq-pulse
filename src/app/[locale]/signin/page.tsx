// ABOUTME: Custom sign-in page with Google authentication.
// ABOUTME: Clean, modern design matching the landing page aesthetic.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import styles from "./signin.module.css";

type SignInProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function SignIn({ params }: SignInProps) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);

  // Check if already signed in
  const session = await auth();
  if (session?.user) {
    redirect(`/${locale}/pulse`);
  }

  return (
    <div className={styles.page} data-dir={rtl ? "rtl" : "ltr"}>
      <div className={styles.container}>
        <Link href={`/${locale}`} className={styles.backLink}>
          <span className={styles.backArrow}>←</span>
          {dict.auth.back}
        </Link>

        <div className={styles.card}>
          <div className={styles.logoSection}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>Nasdaq Pulse</span>
          </div>

          <h1 className={styles.title}>{dict.auth.signinTitle}</h1>
          <p className={styles.subtitle}>{dict.auth.signinSubtitle}</p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: `/${locale}/pulse` });
            }}
          >
            <button type="submit" className={styles.googleButton}>
              <GoogleIcon />
              {dict.auth.googleButton}
            </button>
          </form>

          <div className={styles.divider}>
            <span>{dict.auth.or}</span>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              const email = formData.get("email") as string;
              await signIn("resend", { email, redirectTo: `/${locale}/pulse` });
            }}
            className={styles.emailForm}
          >
            <input
              type="email"
              name="email"
              placeholder={dict.auth.emailPlaceholder}
              required
              className={styles.emailInput}
            />
            <button type="submit" className={styles.emailButton}>
              {dict.auth.emailButton}
            </button>
          </form>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📊</span>
              <span>Real-time market data</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <span>1M, 6M, 12M growth tracking</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🌐</span>
              <span>Bilingual EN/HE support</span>
            </div>
          </div>
        </div>

        <p className={styles.notice}>
          Only approved Google accounts can access this app.
        </p>
      </div>
    </div>
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
