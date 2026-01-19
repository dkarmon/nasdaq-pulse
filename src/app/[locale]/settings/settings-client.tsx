// ABOUTME: Client component for settings page.
// ABOUTME: Displays hidden stocks list per exchange with unhide functionality.

"use client";

import { usePreferences } from "@/hooks/usePreferences";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Exchange } from "@/lib/market-data/types";
import Link from "next/link";
import styles from "./settings.module.css";

type SettingsClientProps = {
  dict: Dictionary;
  locale: Locale;
};

export function SettingsClient({ dict, locale }: SettingsClientProps) {
  const { preferences, unhideStock } = usePreferences();

  const nasdaqHidden = preferences.hiddenSymbols.nasdaq;
  const tlvHidden = preferences.hiddenSymbols.tlv;
  const hasHiddenStocks = nasdaqHidden.length > 0 || tlvHidden.length > 0;

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1 className={styles.title}>{dict.settings.title}</h1>
        <Link href={`/${locale}/pulse`} className={styles.backLink}>
          ← {dict.screener.backToList}
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.settings.hiddenStocks}</h2>

        {!hasHiddenStocks ? (
          <p className={styles.empty}>{dict.settings.noHiddenStocks}</p>
        ) : (
          <>
            {nasdaqHidden.length > 0 && (
              <div className={styles.exchangeSection}>
                <h3 className={styles.exchangeLabel}>{dict.screener.nasdaq}</h3>
                <ul className={styles.stockList}>
                  {nasdaqHidden.map((symbol) => (
                    <li key={symbol} className={styles.stockItem}>
                      <span className={styles.symbol}>{symbol}</span>
                      <button
                        className={styles.unhideButton}
                        onClick={() => unhideStock(symbol, "nasdaq")}
                      >
                        {dict.settings.unhide}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tlvHidden.length > 0 && (
              <div className={styles.exchangeSection}>
                <h3 className={styles.exchangeLabel}>{dict.screener.tlv}</h3>
                <ul className={styles.stockList}>
                  {tlvHidden.map((symbol) => (
                    <li key={symbol} className={styles.stockItem}>
                      <span className={styles.symbol}>{symbol}</span>
                      <button
                        className={styles.unhideButton}
                        onClick={() => unhideStock(symbol, "tlv")}
                      >
                        {dict.settings.unhide}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
