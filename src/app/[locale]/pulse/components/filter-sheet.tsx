// ABOUTME: Mobile-only bottom sheet for filter controls.
// ABOUTME: Slides up from bottom with backdrop, contains all filter options.

"use client";

import { useEffect } from "react";
import type { SortPeriod } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import { SORT_OPTIONS, LIMIT_OPTIONS } from "./controls-bar";
import styles from "./filter-sheet.module.css";

type FilterSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortPeriod;
  limit: number;
  controlsDisabled?: boolean;
  onSortChange: (sort: SortPeriod) => void;
  onLimitChange: (limit: number) => void;
  isAdmin?: boolean;
  formulas?: RecommendationFormulaSummary[];
  activeFormula?: RecommendationFormulaSummary | null;
  onFormulaChange?: (formulaId: string) => void;
  labels: {
    sortBy: string;
    show: string;
    formula?: string;
    apply: string;
  };
};

export function FilterSheet({
  isOpen,
  onClose,
  sortBy,
  limit,
  controlsDisabled = false,
  onSortChange,
  onLimitChange,
  isAdmin = false,
  formulas = [],
  activeFormula,
  onFormulaChange,
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

        {isAdmin && formulas.length > 0 && onFormulaChange && (
          <div className={styles.section}>
            <span className={styles.label}>{labels.formula || "Formula"}</span>
            <select
              className={styles.formulaSelect}
              value={activeFormula?.id || ""}
              onChange={(e) => onFormulaChange(e.target.value)}
            >
              {formulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formula.name}
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
