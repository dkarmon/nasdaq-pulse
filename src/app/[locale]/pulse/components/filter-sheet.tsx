// ABOUTME: Mobile-only bottom sheet for filter controls.
// ABOUTME: Slides up from bottom with backdrop, contains all filter options.

"use client";

import { useEffect } from "react";
import type { SortPeriod, SortDirection } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import { formatFormulaSelectLabel } from "@/lib/recommendations/display";
import { LIMIT_OPTIONS, formatSortLabel } from "./controls-bar";
import styles from "./filter-sheet.module.css";

type FilterSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
  sortOptions: SortPeriod[];
  showRecommendedOnly: boolean;
  controlsDisabled?: boolean;
  onSortChange: (sort: SortPeriod) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onLimitChange: (limit: number) => void;
  isAdmin?: boolean;
  formulas?: RecommendationFormulaSummary[];
  activeFormula?: RecommendationFormulaSummary | null;
  onFormulaChange?: (formulaId: string) => void;
  labels: {
    sortBy: string;
    show: string;
    score: string;
    intraday: string;
    direction: string;
    recommendedOnly: string;
    recommendedMode: string;
    formula?: string;
    apply: string;
  };
};

export function FilterSheet({
  isOpen,
  onClose,
  sortBy,
  sortDirection,
  limit,
  sortOptions,
  showRecommendedOnly,
  controlsDisabled = false,
  onSortChange,
  onSortDirectionChange,
  onLimitChange,
  isAdmin = false,
  formulas = [],
  activeFormula,
  onFormulaChange,
  labels,
}: FilterSheetProps) {
  const sortDisabled = controlsDisabled && !showRecommendedOnly;

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

        {showRecommendedOnly && (
          <div className={styles.modeRow}>
            <span className={styles.modePill}>{labels.recommendedMode}</span>
          </div>
        )}

        <div className={styles.section}>
          <span className={styles.label}>{labels.sortBy}</span>
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
                {formatSortLabel(option, labels)}
              </button>
            ))}
          </div>
        </div>

        {showRecommendedOnly && (
          <div className={styles.section}>
            <span className={styles.label}>{labels.direction}</span>
            <div className={styles.pillGroup}>
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
          </div>
        )}

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

        {showRecommendedOnly && isAdmin && formulas.length > 0 && onFormulaChange && (
          <div className={styles.section}>
            <span className={styles.label}>{labels.formula || "Formula"}</span>
            <select
              className={styles.formulaSelect}
              value={activeFormula?.id || ""}
              onChange={(e) => onFormulaChange(e.target.value)}
            >
              {formulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formatFormulaSelectLabel(formula.name, formula.description)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.applyButton} onClick={onClose}>
            {labels.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
