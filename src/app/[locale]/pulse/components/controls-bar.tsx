// ABOUTME: Control bar with exchange switcher, sort toggle, count presets, and minimum price filter.
// ABOUTME: Compact mobile version with filter sheet; full desktop layout.

"use client";

import { useState, useEffect } from "react";
import type { SortPeriod, ScreenerFilters, Exchange } from "@/lib/market-data/types";
import { FilterSheet } from "./filter-sheet";
import styles from "./controls-bar.module.css";

type ControlsBarProps = {
  exchange: Exchange;
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  searchQuery: string;
  showRecommendedOnly: boolean;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  onMinPriceChange: (value: number | null) => void;
  onClearFilters: () => void;
  onSearchChange: (query: string) => void;
  onShowRecommendedOnlyChange: (show: boolean) => void;
  hasActiveFilters: boolean;
  labels: {
    sortBy: string;
    show: string;
    minPrice: string;
    clearAll: string;
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

function countActiveFilters(
  filters: ScreenerFilters,
  showRecommendedOnly: boolean
): number {
  let count = 0;
  if (filters.minPrice !== null) count++;
  if (showRecommendedOnly) count++;
  return count;
}

export function ControlsBar({
  exchange,
  sortBy,
  limit,
  filters,
  searchQuery,
  showRecommendedOnly,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onLimitChange,
  onMinPriceChange,
  onClearFilters,
  onSearchChange,
  onShowRecommendedOnlyChange,
  hasActiveFilters,
  labels,
}: ControlsBarProps) {
  const [localMinPrice, setLocalMinPrice] = useState<string>(
    filters.minPrice !== null ? String(filters.minPrice) : ""
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    setLocalMinPrice(filters.minPrice !== null ? String(filters.minPrice) : "");
  }, [filters.minPrice]);

  const handleMinPriceChange = (value: string) => {
    setLocalMinPrice(value);
    if (value === "") {
      onMinPriceChange(null);
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        onMinPriceChange(num);
      }
    }
  };

  const exchangeLabels: Record<Exchange, string> = {
    nasdaq: labels.nasdaq,
    tlv: labels.tlv,
  };

  const activeFilterCount = countActiveFilters(filters, showRecommendedOnly);

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

      {/* Desktop full controls */}
      <div className={styles.desktopControls}>
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

          <div className={styles.priceFilterGroup}>
            <span className={styles.label}>{labels.minPrice}:</span>
            <input
              type="number"
              className={styles.priceInput}
              placeholder="0"
              value={localMinPrice}
              onChange={(e) => handleMinPriceChange(e.target.value)}
              min={0}
              step="any"
              aria-label={labels.minPrice}
            />
            {hasActiveFilters && (
              <button
                className={styles.clearButton}
                onClick={onClearFilters}
                title={labels.clearAll}
              >
                ✕
              </button>
            )}
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
        minPrice={filters.minPrice}
        controlsDisabled={controlsDisabled}
        onExchangeChange={onExchangeChange}
        onSortChange={onSortChange}
        onLimitChange={onLimitChange}
        onMinPriceChange={onMinPriceChange}
        onClearFilters={onClearFilters}
        hasActiveFilters={hasActiveFilters}
        labels={{
          sortBy: labels.sortBy,
          show: labels.show,
          minPrice: labels.minPrice,
          clearAll: labels.clearAll,
          exchange: labels.exchange,
          nasdaq: labels.nasdaq,
          tlv: labels.tlv,
          apply: "Apply Filters",
        }}
      />
    </>
  );
}
