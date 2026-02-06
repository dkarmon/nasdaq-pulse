// ABOUTME: Control bar with exchange switcher, sort toggle, and count presets.
// ABOUTME: Compact mobile version with filter sheet; full desktop layout.

"use client";

import { useState, useEffect } from "react";
import { Download, RotateCw, MoreVertical } from "lucide-react";
import type { Stock, SortPeriod, SortDirection, Exchange } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import { exportToExcel } from "@/lib/excel-export";
import { FilterSheet } from "./filter-sheet";
import styles from "./controls-bar.module.css";

type ControlsBarProps = {
  exchange: Exchange;
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
  searchQuery: string;
  showRecommendedOnly: boolean;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (query: string) => void;
  onShowRecommendedOnlyChange: (show: boolean) => void;
  isAdmin?: boolean;
  activeFormula?: RecommendationFormulaSummary | null;
  onFormulaChange?: (formula: RecommendationFormulaSummary) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  visibleStocks?: Stock[];
  rankMap?: Map<string, number>;
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

export const DEFAULT_SORT_OPTIONS: SortPeriod[] = ["1d", "5d", "1m", "6m", "12m", "az"];
export const RECOMMENDED_SORT_OPTIONS: SortPeriod[] = [
  "score",
  "intraday",
  "1d",
  "5d",
  "1m",
  "6m",
  "12m",
];
export const LIMIT_OPTIONS = [25, 50];
export const EXCHANGE_OPTIONS: Exchange[] = ["nasdaq", "tlv"];

export function formatSortLabel(option: SortPeriod): string {
  switch (option) {
    case "az":
      return "A-Z";
    case "score":
      return "Score";
    case "intraday":
      return "Intraday";
    default:
      return option.toUpperCase();
  }
}

export function ControlsBar({
  exchange,
  sortBy,
  sortDirection,
  limit,
  searchQuery,
  showRecommendedOnly,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onSortDirectionChange,
  onLimitChange,
  onSearchChange,
  onShowRecommendedOnlyChange,
  isAdmin = false,
  activeFormula,
  onFormulaChange,
  onRefresh,
  isRefreshing = false,
  visibleStocks,
  rankMap,
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

  const handleExport = () => {
    if (!visibleStocks || !rankMap) return;

    exportToExcel(visibleStocks, rankMap, {
      exchange,
      sortBy,
      sortDirection,
      limit,
      recommendedOnly: showRecommendedOnly,
      formula: activeFormula ?? null,
    });
  };

  const exchangeLabels: Record<Exchange, string> = {
    nasdaq: labels.nasdaq,
    tlv: labels.tlv,
  };

  const activeFilterCount = showRecommendedOnly ? 1 : 0;
  const sortOptions = showRecommendedOnly ? RECOMMENDED_SORT_OPTIONS : DEFAULT_SORT_OPTIONS;
  const sortDisabled = controlsDisabled && !showRecommendedOnly;

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
          {isAdmin && onRefresh && (
            <button
              className={styles.mobileRefreshButton}
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RotateCw size={20} className={isRefreshing ? styles.spinning : ""} />
            </button>
          )}
          <button
            className={styles.mobileFilterButton}
            onClick={() => setIsFilterSheetOpen(true)}
            data-has-filters={activeFilterCount > 0}
            aria-label="Open filters"
          >
            <MoreVertical size={20} />
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
        {/* Row 1: Exchange + Search + Recommended + Export */}
        <div className={styles.primaryRow}>
          <div className={styles.exchangeToggle}>
            {EXCHANGE_OPTIONS.map((option) => (
              <button
                key={option}
                className={styles.desktopExchangeOption}
                data-active={exchange === option}
                onClick={() => onExchangeChange(option)}
                aria-pressed={exchange === option}
              >
                {exchangeLabels[option]}
              </button>
            ))}
          </div>

          <input
            type="text"
            className={styles.desktopSearchInput}
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
            ★
          </button>

          {isAdmin && onRefresh && (
            <button
              className={styles.refreshButton}
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RotateCw size={18} className={isRefreshing ? styles.spinning : ""} />
            </button>
          )}

          {isAdmin && visibleStocks && rankMap && (
            <button
              className={styles.exportButton}
              onClick={handleExport}
              title="Export to Excel"
            >
              <Download size={18} />
            </button>
          )}
        </div>

        {/* Row 2: Sort + Show + Formula */}
        <div className={styles.secondaryRow} data-disabled={controlsDisabled}>
          <div className={styles.sortGroup}>
            <span className={styles.label}>{labels.sortBy}:</span>
            <div className={styles.pillGroup}>
              {sortOptions.map((option) => (
                <button
                  key={option}
                  className={styles.pill}
                  data-active={sortBy === option}
                  data-disabled={sortDisabled}
                  disabled={sortDisabled}
                  onClick={() => onSortChange(option)}
                  aria-pressed={sortBy === option}
                >
                  {formatSortLabel(option)}
                </button>
              ))}
            </div>
            {showRecommendedOnly && (
              <div className={styles.directionToggle} role="group" aria-label="Sort direction">
                <button
                  className={styles.directionPill}
                  data-active={sortDirection === "asc"}
                  onClick={() => onSortDirectionChange("asc")}
                  aria-pressed={sortDirection === "asc"}
                >
                  ↑
                </button>
                <button
                  className={styles.directionPill}
                  data-active={sortDirection === "desc"}
                  onClick={() => onSortDirectionChange("desc")}
                  aria-pressed={sortDirection === "desc"}
                >
                  ↓
                </button>
              </div>
            )}
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
        sortBy={sortBy}
        sortDirection={sortDirection}
        limit={limit}
        sortOptions={sortOptions}
        showRecommendedOnly={showRecommendedOnly}
        controlsDisabled={controlsDisabled}
        onSortChange={onSortChange}
        onSortDirectionChange={onSortDirectionChange}
        onLimitChange={onLimitChange}
        isAdmin={isAdmin}
        formulas={formulas}
        activeFormula={activeFormula}
        onFormulaChange={handleFormulaChange}
        labels={{
          sortBy: labels.sortBy,
          show: labels.show,
          formula: labels.formula || "Formula",
          apply: "Apply Filters",
        }}
      />
    </>
  );
}
