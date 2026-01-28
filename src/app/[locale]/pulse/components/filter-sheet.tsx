// ABOUTME: Mobile-only bottom sheet for filter controls.
// ABOUTME: Slides up from bottom with backdrop, contains all filter options.

"use client";

import { useState, useEffect } from "react";
import type { SortPeriod, Exchange } from "@/lib/market-data/types";
import styles from "./filter-sheet.module.css";

type FilterSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  exchange: Exchange;
  sortBy: SortPeriod;
  limit: number;
  minPrice: number | null;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  onMinPriceChange: (value: number | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  labels: {
    sortBy: string;
    show: string;
    minPrice: string;
    clearAll: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
    apply: string;
  };
};

const SORT_OPTIONS: SortPeriod[] = ["1d", "5d", "1m", "6m", "12m", "az"];
const LIMIT_OPTIONS = [25, 50];
const EXCHANGE_OPTIONS: Exchange[] = ["nasdaq", "tlv"];

export function FilterSheet({
  isOpen,
  onClose,
  exchange,
  sortBy,
  limit,
  minPrice,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onLimitChange,
  onMinPriceChange,
  onClearFilters,
  hasActiveFilters,
  labels,
}: FilterSheetProps) {
  const [localMinPrice, setLocalMinPrice] = useState<string>(
    minPrice !== null ? String(minPrice) : ""
  );

  useEffect(() => {
    setLocalMinPrice(minPrice !== null ? String(minPrice) : "");
  }, [minPrice]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div
        className={styles.backdrop}
        onClick={onClose}
        data-testid="filter-sheet-backdrop"
      />
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.section}>
          <span className={styles.label}>{labels.exchange}</span>
          <div className={styles.pillGroup}>
            {EXCHANGE_OPTIONS.map((option) => (
              <button
                key={option}
                className={styles.pill}
                data-active={exchange === option}
                onClick={() => onExchangeChange(option)}
                aria-pressed={exchange === option}
              >
                {exchangeLabels[option]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>{labels.sortBy}</span>
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

        <div className={styles.section}>
          <span className={styles.label}>{labels.show}</span>
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

        <div className={styles.section}>
          <span className={styles.label}>{labels.minPrice}</span>
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
        </div>

        <div className={styles.actions}>
          <button className={styles.applyButton} onClick={onClose}>
            {labels.apply}
          </button>
          {hasActiveFilters && (
            <button className={styles.clearButton} onClick={onClearFilters}>
              {labels.clearAll}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
