// ABOUTME: Mobile-only bottom sheet for filter controls.
// ABOUTME: Slides up from bottom with backdrop, contains all filter options.

"use client";

import { useEffect } from "react";
import type { SortPeriod, Exchange } from "@/lib/market-data/types";
import { SORT_OPTIONS, LIMIT_OPTIONS, EXCHANGE_OPTIONS } from "./controls-bar";
import styles from "./filter-sheet.module.css";

type FilterSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  exchange: Exchange;
  sortBy: SortPeriod;
  limit: number;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  labels: {
    sortBy: string;
    show: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
    apply: string;
  };
};

export function FilterSheet({
  isOpen,
  onClose,
  exchange,
  sortBy,
  limit,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onLimitChange,
  labels,
}: FilterSheetProps) {
  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

        <div className={styles.actions}>
          <button className={styles.applyButton} onClick={onClose}>
            {labels.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
