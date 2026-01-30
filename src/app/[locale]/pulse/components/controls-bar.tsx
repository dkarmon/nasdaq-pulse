// ABOUTME: Control bar with exchange switcher, sort toggle, and count presets.
// ABOUTME: Compact mobile version with filter sheet; full desktop layout.

"use client";

import { useState, useEffect } from "react";
import type { SortPeriod, Exchange } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
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
  isAdmin?: boolean;
  activeFormula?: RecommendationFormulaSummary | null;
  onFormulaChange?: (formula: RecommendationFormulaSummary) => void;
  labels: {
    sortBy: string;
    show: string;
    search: string;
    recommendedOnly: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
    formula?: string;
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
  isAdmin = false,
  activeFormula,
  onFormulaChange,
  labels,
}: ControlsBarProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [formulas, setFormulas] = useState<RecommendationFormulaSummary[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/admin/recommendation-formulas")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.formulas) {
            setFormulas(data.formulas);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleFormulaChange = async (formulaId: string) => {
    const formula = formulas.find((f) => f.id === formulaId);
    if (!formula || !onFormulaChange) return;

    await fetch("/api/admin/recommendation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeFormulaId: formulaId }),
    });

    onFormulaChange(formula);
  };

  const exchangeLabels: Record<Exchange, string> = {
    nasdaq: labels.nasdaq,
    tlv: labels.tlv,
  };

  const activeFilterCount = countActiveFilters(showRecommendedOnly);

  return (
    <>
      {/* Mobile compact bar */}
      <div className={styles.mobileControls}>
        {/* Row 1: Exchange toggle, starred, filter button */}
        <div className={styles.mobileControlsRow}>
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
        {/* Row 2: Search (full width) */}
        <input
          type="text"
          className={styles.mobileSearchInput}
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={labels.search}
        />
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

          {isAdmin && formulas.length > 0 && (
            <div className={styles.formulaGroup}>
              <span className={styles.label}>{labels.formula || "Formula"}:</span>
              <select
                className={styles.formulaSelect}
                value={activeFormula?.id || ""}
                onChange={(e) => handleFormulaChange(e.target.value)}
              >
                {formulas.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
        isAdmin={isAdmin}
        formulas={formulas}
        activeFormula={activeFormula}
        onFormulaChange={handleFormulaChange}
        labels={{
          sortBy: labels.sortBy,
          show: labels.show,
          exchange: labels.exchange,
          nasdaq: labels.nasdaq,
          tlv: labels.tlv,
          formula: labels.formula || "Formula",
          apply: "Apply Filters",
        }}
      />
    </>
  );
}
