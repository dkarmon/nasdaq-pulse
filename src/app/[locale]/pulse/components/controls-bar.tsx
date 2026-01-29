// ABOUTME: Control bar with exchange switcher, sort toggle, and count presets.
// ABOUTME: Compact mobile version with filter sheet; full desktop layout.

"use client";

import { useState } from "react";
import type { SortPeriod, Exchange } from "@/lib/market-data/types";
import { FilterSheet } from "./filter-sheet";
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

export const SORT_OPTIONS: SortPeriod[] = ["1d", "5d", "1m", "6m", "12m", "az"];
export const LIMIT_OPTIONS = [25, 50];
export const EXCHANGE_OPTIONS: Exchange[] = ["nasdaq", "tlv"];

function countActiveFilters(showRecommendedOnly: boolean): number {
  return showRecommendedOnly ? 1 : 0;
}

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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const exchangeLabels: Record<Exchange, string> = {
    nasdaq: labels.nasdaq,
    tlv: labels.tlv,
  };

  const activeFilterCount = countActiveFilters(showRecommendedOnly);

  return (
    <>
      {/* Mobile compact bar */}
      <div className={styles.mobileControls}>
        <div className={styles.mobileExchangeToggle}>
          {EXCHANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={styles.mobileExchangeOption}
              data-active={exchange === option}
              onClick={() => onExchangeChange(option)}
              aria-pressed={exchange === option}
            >
              {option === "nasdaq" ? "NASDAQ" : "TLV"}
            </button>
          ))}
        </div>
        <input
          type="text"
          className={styles.mobileSearchInput}
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={labels.search}
        />
        <div className={styles.mobileActionsRow}>
          <button
            className={styles.mobileRecommendedToggle}
            data-active={showRecommendedOnly}
            onClick={() => onShowRecommendedOnlyChange(!showRecommendedOnly)}
            aria-pressed={showRecommendedOnly}
            title={labels.recommendedOnly}
          >
            ★
          </button>
          <button
            className={styles.mobileFilterButton}
            onClick={() => setIsFilterSheetOpen(true)}
            data-has-filters={activeFilterCount > 0}
            aria-label="Open filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.filterIcon}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop full controls */}
      <div className={styles.desktopControls}>
        <div className={styles.exchangeToggle}>
          {EXCHANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={styles.exchangeOption}
              data-active={exchange === option}
              onClick={() => onExchangeChange(option)}
              aria-pressed={exchange === option}
            >
              {exchangeLabels[option]}
            </button>
          ))}
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

      {/* Mobile filter sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        exchange={exchange}
        sortBy={sortBy}
        limit={limit}
        controlsDisabled={controlsDisabled}
        onExchangeChange={onExchangeChange}
        onSortChange={onSortChange}
        onLimitChange={onLimitChange}
        labels={{
          sortBy: labels.sortBy,
          show: labels.show,
          exchange: labels.exchange,
          nasdaq: labels.nasdaq,
          tlv: labels.tlv,
          apply: "Apply Filters",
        }}
      />
    </>
  );
}
