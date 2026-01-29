// ABOUTME: Sign-in page with Google OAuth and magic link authentication.
// ABOUTME: Uses Supabase Auth for authentication flow.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
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
          <div className={styles.logoSection}>
            <BrandLogo size="lg" />
          </div>
          <p className={styles.subtitle}>{dict.auth.signinSubtitle}</p>

          <SignInForm locale={locale} dict={dict} />
        </div>

        <p className={styles.notice}>
          Only invited users can access this app.
        </p>
      </div>
    </div>
  );
}
