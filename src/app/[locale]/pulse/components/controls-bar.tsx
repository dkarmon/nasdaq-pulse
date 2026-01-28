// ABOUTME: Control bar with exchange switcher, sort toggle, and count presets.
// ABOUTME: Designed for elderly users with large touch targets and clear labels.

"use client";

import type { SortPeriod, Exchange } from "@/lib/market-data/types";
import styles from "./controls-bar.module.css";

type ControlsBarProps = {
  exchange: Exchange;
  sortBy: SortPeriod;
  limit: number;
  searchQuery: string;
  showRecommendedOnly: boolean;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (query: string) => void;
  onShowRecommendedOnlyChange: (show: boolean) => void;
  labels: {
    sortBy: string;
    show: string;
    search: string;
    recommendedOnly: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
  };
};

const SORT_OPTIONS: SortPeriod[] = ["1d", "5d", "1m", "6m", "12m", "az"];
const LIMIT_OPTIONS = [25, 50];
const EXCHANGE_OPTIONS: Exchange[] = ["nasdaq", "tlv"];

export function ControlsBar({
  exchange,
  sortBy,
  limit,
  searchQuery,
  showRecommendedOnly,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onLimitChange,
  onSearchChange,
  onShowRecommendedOnlyChange,
  labels,
}: ControlsBarProps) {
  const exchangeLabels: Record<Exchange, string> = {
    nasdaq: labels.nasdaq,
    tlv: labels.tlv,
  };

  return (
    <div className={styles.controls}>
      <div className={styles.exchangeRow}>
        <div className={styles.pillGroup}>
          {EXCHANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={styles.exchangePill}
              data-active={exchange === option}
              onClick={() => onExchangeChange(option)}
              aria-pressed={exchange === option}
            >
              {exchangeLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={labels.search}
        />
        <button
          className={styles.recommendedToggle}
          data-active={showRecommendedOnly}
          onClick={() => onShowRecommendedOnlyChange(!showRecommendedOnly)}
          aria-pressed={showRecommendedOnly}
          title={labels.recommendedOnly}
        >
          ★ {labels.recommendedOnly}
        </button>
      </div>

      <div className={styles.mainRow} data-disabled={controlsDisabled}>
        <div className={styles.sortGroup}>
          <span className={styles.label}>{labels.sortBy}:</span>
          <div className={styles.pillGroup}>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                className={styles.pill}
                data-active={sortBy === option}
                data-disabled={controlsDisabled}
                disabled={controlsDisabled}
                onClick={() => onSortChange(option)}
                aria-pressed={sortBy === option}
              >
                {option === "az" ? "A-Z" : option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.limitGroup}>
          <span className={styles.label}>{labels.show}:</span>
          <div className={styles.pillGroup}>
            {LIMIT_OPTIONS.map((option) => (
              <button
                key={option}
                className={styles.pill}
                data-active={limit === option}
                data-disabled={controlsDisabled}
                disabled={controlsDisabled}
                onClick={() => onLimitChange(option)}
                aria-pressed={limit === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
