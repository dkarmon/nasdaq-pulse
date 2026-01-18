import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import styles from "./landing.module.css";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { demoQuotes } from "@/lib/demo-data";

type LandingProps = {
  params: { locale: Locale };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Landing({ params }: LandingProps) {
  const locale = locales.includes(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);

  return (
    <div className="page-shell" data-dir={rtl ? "rtl" : "ltr"}>
      <div className="container">
        <TopNav locale={locale} dict={dict} />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className="badge">{dict.nav.localeName}</div>
            <h1 className={styles.heroTitle}>{dict.landing.title}</h1>
            <p className={styles.heroSubtitle}>{dict.landing.subtitle}</p>
            <div className={styles.ctaRow}>
              <Link
                className="btn primary"
                href={`/api/auth/signin?callbackUrl=/${locale}/pulse`}
              >
                {dict.landing.heroCta}
              </Link>
              <a className="btn secondary" href="#demo">
                {dict.landing.heroSecondary}
              </a>
            </div>
            <div className={styles.chipRow}>
              {dict.landing.highlights.map((item) => (
                <div key={item.title} className="pill" data-active={!!item.tag}>
                  <div>
                    <div className="numeric" style={{ fontWeight: 800 }}>
                      {item.title}
                    </div>
                    <div className="muted" style={{ fontSize: "0.95rem" }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.heroCard} card`}>
            <h3 className="numeric">Latency budget</h3>
            <p className="muted" style={{ marginBottom: 10 }}>
              Edge proxy with cache-first data delivery.
            </p>
            <div className={styles.demoList}>
              <div className={styles.demoItem}>
                <span className="badge positive">Quotes</span>
                <span className="numeric">60–120s TTL</span>
              </div>
              <div className={styles.demoItem}>
                <span className="badge">1M series</span>
                <span className="numeric">6–12h TTL</span>
              </div>
              <div className={styles.demoItem}>
                <span className="badge">6M / 1Y</span>
                <span className="numeric">12–24h TTL</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{dict.landing.featureTitle}</h2>
            <p>{dict.landing.featureSubtitle}</p>
          </div>
          <div className={styles.grid3}>
            {dict.landing.features.map((feature) => (
              <div key={feature.title} className={`${styles.featureCard} card`}>
                {feature.tag ? (
                  <div className="badge featureTag">{feature.tag}</div>
                ) : null}
                <h3>{feature.title}</h3>
                <p className="muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{dict.landing.demoTitle}</h2>
            <p>{dict.landing.demoSubtitle}</p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: "14px" }}>
            <div className="card">
              <div className="badge" style={{ marginBottom: 10 }}>
                {dict.app.watchlist}
              </div>
              <div className={styles.demoList}>
                {demoQuotes.map((quote) => (
                  <div key={quote.symbol} className={styles.demoItem}>
                    <div>
                      <div className={`${styles.demoItemTitle} numeric`}>
                        {quote.symbol} · {quote.changePct > 0 ? "▲" : "▼"}{" "}
                        {quote.changePct.toFixed(2)}%
                      </div>
                      <div className={styles.demoItemBody}>
                        {quote.status === "live" ? dict.app.freshnessLive : dict.app.freshnessStale} ·{" "}
                        {quote.marketCap}
                      </div>
                    </div>
                    <div
                      className={`badge ${
                        quote.changePct > 0 ? "positive" : quote.changePct < 0 ? "negative" : ""
                      }`}
                    >
                      <span className="numeric">
                        {quote.price.toFixed(2)} {quote.change > 0 ? "▲" : "▼"} {quote.change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="badge" style={{ marginBottom: 12 }}>
                News + sentiment
              </div>
              <div className={styles.demoList}>
                {dict.landing.demoList.map((item) => (
                  <div key={item.title} className={styles.demoItem}>
                    <div>
                      <div className={`${styles.demoItemTitle} numeric`}>{item.title}</div>
                      <div className={styles.demoItemBody}>{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
