// ABOUTME: Tab component for managing hidden stocks and omit rules.
// ABOUTME: Displays per-exchange lists with unhide functionality.

"use client";

import { usePreferences } from "@/hooks/usePreferences";
import { getHebrewName } from "@/lib/market-data/tase-symbols";
import type { Dictionary } from "@/lib/i18n";
import { OmitRulesPanel } from "./omit-rules-panel";
import styles from "./settings.module.css";

type StocksTabProps = {
  dict: Dictionary;
  isAdmin: boolean;
};

export function StocksTab({ dict, isAdmin }: StocksTabProps) {
  const { preferences, unhideStock } = usePreferences();

  const nasdaqHidden = preferences.hiddenSymbols.nasdaq;
  const tlvHidden = preferences.hiddenSymbols.tlv;
  const hasHiddenStocks = nasdaqHidden.length > 0 || tlvHidden.length > 0;

  return (
    <>
      <OmitRulesPanel dict={dict} isAdmin={isAdmin} />

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
                    <span className={styles.symbol}>{getHebrewName(symbol) || symbol}</span>
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
    </>
  );
}
