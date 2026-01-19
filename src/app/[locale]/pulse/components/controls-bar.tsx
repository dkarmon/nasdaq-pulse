// ABOUTME: Control bar with sort toggle, count presets, and filter presets.
// ABOUTME: Designed for elderly users with large touch targets and clear labels.

"use client";

import { useState } from "react";
import type { SortPeriod, FilterPreset, FilterValue, ScreenerFilters } from "@/lib/market-data/types";
import styles from "./controls-bar.module.css";

type ControlsBarProps = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  searchQuery: string;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  onFilterChange: (period: keyof ScreenerFilters, value: FilterValue) => void;
  onClearFilters: () => void;
  onSearchChange: (query: string) => void;
  hasActiveFilters: boolean;
  labels: {
    sortBy: string;
    show: string;
    filters: string;
    max: string;
    clearAll: string;
    any: string;
    search: string;
  };
};

const SORT_OPTIONS: SortPeriod[] = ["1m", "6m", "12m"];
const LIMIT_OPTIONS = [25, 50, 100];
const FILTER_PRESETS: FilterPreset[] = ["any", "5", "10", "25"];

export function ControlsBar({
  sortBy,
  limit,
  filters,
  searchQuery,
  onSortChange,
  onLimitChange,
  onFilterChange,
  onClearFilters,
  onSearchChange,
  hasActiveFilters,
  labels,
}: ControlsBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className={styles.controls}>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
          aria-label={labels.search}
        />
      </div>

      <div className={styles.mainRow}>
        <div className={styles.sortGroup}>
          <span className={styles.label}>{labels.sortBy}:</span>
          <div className={styles.pillGroup}>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                className={styles.pill}
                data-active={sortBy === option}
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
