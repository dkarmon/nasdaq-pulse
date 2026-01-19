// ABOUTME: Client component for settings page.
// ABOUTME: Displays hidden stocks list with unhide functionality.

"use client";

import { usePreferences } from "@/hooks/usePreferences";
import type { Dictionary, Locale } from "@/lib/i18n";
import Link from "next/link";
import styles from "./settings.module.css";

type SettingsClientProps = {
  dict: Dictionary;
  locale: Locale;
};

export function SettingsClient({ dict, locale }: SettingsClientProps) {
  const { preferences, unhideStock } = usePreferences();

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

        {preferences.hiddenSymbols.length === 0 ? (
          <p className={styles.empty}>{dict.settings.noHiddenStocks}</p>
        ) : (
          <ul className={styles.stockList}>
            {preferences.hiddenSymbols.map((symbol) => (
              <li key={symbol} className={styles.stockItem}>
                <span className={styles.symbol}>{symbol}</span>
                <button
                  className={styles.unhideButton}
                  onClick={() => unhideStock(symbol)}
                >
                  {dict.settings.unhide}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
