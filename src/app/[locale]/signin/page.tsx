// ABOUTME: Sign-in page with Google OAuth and magic link authentication.
// ABOUTME: Uses Supabase Auth for authentication flow.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import styles from "./signin.module.css";
import { SignInForm } from "./signin-form";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
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
          <h1 className={styles.title}>{dict.auth.signinTitle}</h1>
          <p className={styles.subtitle}>{dict.auth.signinSubtitle}</p>

          <SignInForm locale={locale} dict={dict} />

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
          Only invited users can access this app.
        </p>
      </div>
    </div>
  );
}
