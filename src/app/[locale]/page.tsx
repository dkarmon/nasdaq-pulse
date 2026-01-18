// ABOUTME: Modern, clean landing page for Nasdaq Pulse.
// ABOUTME: Marketing-focused with clear CTA and minimal visual noise.

import Link from "next/link";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import styles from "./landing.module.css";

type LandingProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Landing({ params }: LandingProps) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);

  return (
    <div className={styles.page} data-dir={rtl ? "rtl" : "ltr"}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>Nasdaq Pulse</span>
          </div>
          <div className={styles.navActions}>
            <LocaleSwitcher locale={locale} />
            <Link
              href={`/${locale}/signin`}
              className={styles.navLink}
            >
              {dict.nav.signIn}
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>
              <span className={styles.dot} />
              {dict.app.freshnessLive}
            </div>
            <h1 className={styles.heroTitle}>
              Track NASDAQ&apos;s
              <br />
              <span className={styles.gradient}>top performers</span>
            </h1>
            <p className={styles.heroSubtitle}>
              {dict.landing.subtitle}
            </p>
            <div className={styles.heroCta}>
              <Link
                href={`/${locale}/signin`}
                className={styles.primaryButton}
              >
                {dict.landing.heroCta}
                <span className={styles.arrow}>→</span>
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.mockCard}>
              <div className={styles.mockHeader}>
                <span className={styles.mockDot} />
                <span className={styles.mockDot} />
                <span className={styles.mockDot} />
              </div>
              <div className={styles.mockContent}>
                <div className={styles.mockRow}>
                  <span className={styles.mockSymbol}>NVDA</span>
                  <span className={styles.mockGrowth}>+18.2%</span>
                </div>
                <div className={styles.mockRow}>
                  <span className={styles.mockSymbol}>SMCI</span>
                  <span className={styles.mockGrowth}>+25.1%</span>
                </div>
                <div className={styles.mockRow}>
                  <span className={styles.mockSymbol}>META</span>
                  <span className={styles.mockGrowth}>+8.9%</span>
                </div>
                <div className={styles.mockRow}>
                  <span className={styles.mockSymbol}>AAPL</span>
                  <span className={styles.mockGrowth}>+6.4%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h3 className={styles.featureTitle}>Growth Metrics</h3>
              <p className={styles.featureText}>
                Sort and filter by 1-month, 6-month, or 12-month growth. Find the stocks that matter.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <h3 className={styles.featureTitle}>Real-time Data</h3>
              <p className={styles.featureText}>
                Fresh quotes every 60 seconds. Historical data cached intelligently to respect rate limits.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌐</div>
              <h3 className={styles.featureTitle}>Bilingual</h3>
              <p className={styles.featureText}>
                Full English and Hebrew support with RTL layout. Built for global accessibility.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <p className={styles.ctaSubtitle}>
            Sign in with your Google account to access the full screener.
          </p>
          <Link
            href={`/${locale}/signin`}
            className={styles.primaryButton}
          >
            {dict.landing.heroCta}
            <span className={styles.arrow}>→</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 Nasdaq Pulse</p>
      </footer>
    </div>
  );
}
