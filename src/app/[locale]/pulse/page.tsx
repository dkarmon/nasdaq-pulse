import { getServerSession } from "next-auth";
import { Locale, defaultLocale, getDictionary, isRTL, locales } from "@/lib/i18n";
import { authOptions } from "@/lib/auth/options";
import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out";
import styles from "./pulse.module.css";
import { demoNews, demoQuotes } from "@/lib/demo-data";

type PulsePageProps = {
  params: { locale: Locale };
};

const rangePills = ["1D", "1W", "1M", "6M", "1Y"];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function PulsePage({ params }: PulsePageProps) {
  const locale = locales.includes(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRTL(locale);
  const session = await getServerSession(authOptions);

  return (
    <div className="page-shell" data-dir={rtl ? "rtl" : "ltr"}>
      <div className="container">
        <div className={styles.heroStrip}>
          <div className={styles.heroText}>
            <div className="badge positive">{dict.app.freshnessLive}</div>
            <div className="numeric" style={{ fontSize: "1.3rem", fontWeight: 800 }}>
              {dict.app.welcome}
            </div>
            <p className="muted">{dict.app.fallbackData}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="badge">{session?.user?.email ?? "demo@nasdaqpulse"}</span>
            <LocaleSwitcher locale={locale} />
            <SignOutButton label={dict.app.logout} />
          </div>
        </div>

        <div className={styles.gridLayout}>
          <div className={`card ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Brand />
                <div className="badge">{dict.app.watchlist}</div>
              </div>
              <button className="btn ghost">{dict.app.addTicker}</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th align="left">Ticker</th>
                  <th align="right">Price</th>
                  <th align="right">Change</th>
                  <th align="right">Cap</th>
                  <th align="right">Status</th>
                </tr>
              </thead>
              <tbody>
                {demoQuotes.map((quote) => (
                  <tr key={quote.symbol}>
                    <td className="numeric">{quote.symbol}</td>
                    <td align="right" className="numeric">
                      ${quote.price.toFixed(2)}
                    </td>
                    <td
                      align="right"
                      className="numeric"
                      style={{ color: quote.changePct >= 0 ? "#8df0c7" : "#f8bac8" }}
                    >
                      {quote.changePct >= 0 ? "▲" : "▼"} {quote.changePct.toFixed(2)}%
                    </td>
                    <td align="right" className="numeric">
                      {quote.marketCap}
                    </td>
                    <td align="right">
                      <span className={`badge ${quote.status === "live" ? "positive" : "negative"}`}>
                        {quote.status === "live" ? dict.app.freshnessLive : dict.app.freshnessStale}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="divider" style={{ margin: "16px 0" }} />

            <div className={styles.rangeRow}>
              {rangePills.map((range) => (
                <button
                  key={range}
                  className="pill"
                  data-active={range === "1M"}
                  aria-pressed={range === "1M"}
                >
                  {range}
                </button>
              ))}
              <div className="badge">{dict.app.comparison}</div>
            </div>
            <div className={styles.chartPlaceholder}>Chart placeholder (connect API)</div>
          </div>

          <div className={`card ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div>
                <div className="badge" style={{ marginBottom: 6 }}>
                  {dict.app.detail}
                </div>
                <div className="numeric" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  AAPL
                </div>
              </div>
              <div className="badge positive">{dict.app.freshnessLive}</div>
            </div>
            <div className={styles.statGrid}>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>Price</div>
                <div className={`${styles.statValue} numeric`}>$192.68</div>
              </div>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>Change 1M</div>
                <div className={`${styles.statValue} numeric`} style={{ color: "#8df0c7" }}>
                  +6.4%
                </div>
              </div>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>52w range</div>
                <div className={`${styles.statValue} numeric`}>165 — 199</div>
              </div>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>Market cap</div>
                <div className={`${styles.statValue} numeric`}>$2.95T</div>
              </div>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>P/E (TTM)</div>
                <div className={`${styles.statValue} numeric`}>31.5</div>
              </div>
              <div className={`${styles.statCard} card`}>
                <div className={styles.statLabel}>Dividend</div>
                <div className={`${styles.statValue} numeric`}>0.55%</div>
              </div>
            </div>

            <div className="divider" style={{ margin: "14px 0" }} />

            <div className={styles.panelHeader}>
              <div className="badge">{dict.app.news}</div>
              <div className={styles.pillGroup}>
                <span className="pill">{dict.app.comparison}</span>
                <span className="pill">{dict.app.watchlist}</span>
              </div>
            </div>
            <div className={styles.newsList}>
              {demoNews.map((item) => (
                <div key={item.headline} className={styles.newsItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ fontWeight: 700 }}>{item.headline}</div>
                    <span
                      className={`badge ${
                        item.sentiment === "positive"
                          ? "positive"
                          : item.sentiment === "negative"
                          ? "negative"
                          : ""
                      }`}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                  <div className={styles.newsMeta}>
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
