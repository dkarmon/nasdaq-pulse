// ABOUTME: Control bar with exchange switcher, sort toggle, count presets, and filter presets.
// ABOUTME: Designed for elderly users with large touch targets and clear labels.

"use client";

import { useState, useEffect } from "react";
import type { SortPeriod, FilterPreset, FilterValue, ScreenerFilters, Exchange } from "@/lib/market-data/types";
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
  onFilterChange: (period: keyof ScreenerFilters, value: FilterValue) => void;
  onClearFilters: () => void;
  onSearchChange: (query: string) => void;
  onShowRecommendedOnlyChange: (show: boolean) => void;
  hasActiveFilters: boolean;
  labels: {
    sortBy: string;
    show: string;
    filters: string;
    max: string;
    clearAll: string;
    any: string;
    search: string;
    recommendedOnly: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
  };
};

const SORT_OPTIONS: SortPeriod[] = ["5d", "1m", "6m", "12m"];
const LIMIT_OPTIONS = [25, 50, 100];
const FILTER_PRESETS: FilterPreset[] = ["any", "5", "10", "25"];
const EXCHANGE_OPTIONS: Exchange[] = ["nasdaq", "tlv"];

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
  onFilterChange,
  onClearFilters,
  onSearchChange,
  onShowRecommendedOnlyChange,
  hasActiveFilters,
  labels,
}: ControlsBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    if (controlsDisabled) {
      setFiltersExpanded(false);
    }
  }, [controlsDisabled]);

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
          onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
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
                {option.toUpperCase()}
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

      <div className={styles.filterToggle}>
        <button
          className={styles.filterButton}
          data-disabled={controlsDisabled}
          disabled={controlsDisabled}
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          aria-expanded={filtersExpanded}
        >
          {labels.filters} {filtersExpanded ? "▲" : "▼"}
          {hasActiveFilters && <span className={styles.filterDot} />}
        </button>
      </div>

      {filtersExpanded && (
        <div className={styles.filterPanel}>
          <FilterRow
            label={`${labels.max} 5D:`}
            value={filters.max5d}
            onChange={(v) => onFilterChange("max5d", v)}
            anyLabel={labels.any}
          />
          <FilterRow
            label={`${labels.max} 1M:`}
            value={filters.max1m}
            onChange={(v) => onFilterChange("max1m", v)}
            anyLabel={labels.any}
          />
          <FilterRow
            label={`${labels.max} 6M:`}
            value={filters.max6m}
            onChange={(v) => onFilterChange("max6m", v)}
            anyLabel={labels.any}
          />
          <FilterRow
            label={`${labels.max} 12M:`}
            value={filters.max12m}
            onChange={(v) => onFilterChange("max12m", v)}
            anyLabel={labels.any}
          />

          {hasActiveFilters && (
            <button className={styles.clearButton} onClick={onClearFilters}>
              {labels.clearAll}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type FilterRowProps = {
  label: string;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  anyLabel: string;
};

function FilterRow({ label, value, onChange, anyLabel }: FilterRowProps) {
  const isCustom = typeof value === "number" && !FILTER_PRESETS.includes(value.toString() as FilterPreset);

  return (
    <div className={styles.filterRow}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.pillGroup}>
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset}
            className={styles.pill}
            data-active={value === preset || (preset !== "any" && value === Number(preset))}
            onClick={() => onChange(preset)}
            aria-pressed={value === preset || (preset !== "any" && value === Number(preset))}
          >
            {preset === "any" ? anyLabel : `≤${preset}%`}
          </button>
        ))}
        <input
          type="number"
          className={styles.customInput}
          placeholder="%"
          value={isCustom ? value : ""}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              onChange(num);
            } else if (e.target.value === "") {
              onChange("any");
            }
          }}
          min={0}
          max={1000}
          aria-label={`Custom maximum ${label}`}
        />
      </div>
    </div>
  );
}
