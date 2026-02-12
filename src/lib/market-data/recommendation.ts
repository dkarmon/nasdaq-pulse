// ABOUTME: Pure helpers for recommendation filtering and scoring.
// ABOUTME: Wraps the expression-based evaluator with sane defaults.

import { defaultRecommendationFormula } from "@/lib/recommendations/config";
import {
  calculateRecommendationScore as evalScore,
  filterAndSortByScore,
  scoreStocks,
} from "@/lib/recommendations/engine";
import type { RecommendationFormula, RecommendationFormulaSummary } from "@/lib/recommendations/types";
import type { Stock } from "./types";

type FormulaInput = RecommendationFormula | RecommendationFormulaSummary | null | undefined;

function hasRequiredFields(stock: Stock): boolean {
  return (
    stock.growth1m !== undefined &&
    stock.growth3m !== undefined &&
    stock.growth6m !== undefined &&
    stock.growth12m !== undefined &&
    typeof stock.price === "number" &&
    typeof stock.marketCap === "number"
  );
}

export function hasValidRecommendationData(stock: Stock): boolean {
  return hasRequiredFields(stock);
}

export function calculateRecommendationScore(
  stock: Stock,
  formula?: FormulaInput
): number | null {
  if (!hasRequiredFields(stock)) return null;

  if (
    stock.recommendationScore !== undefined &&
    (formula === undefined ||
      formula === null ||
      (typeof (formula as any)?.id === "string" &&
        stock.recommendationFormulaId === (formula as any).id))
  ) {
    return stock.recommendationScore;
  }

  const fallbackFormula =
    formula ?? (stock.recommendationFormulaId ? null : defaultRecommendationFormula);

  return evalScore(stock, fallbackFormula ?? defaultRecommendationFormula);
}

export function isStockRecommended(
  stock: Stock,
  formula?: FormulaInput
): boolean {
  const score = calculateRecommendationScore(stock, formula);
  return score !== null && score > 0;
}

export function scoreStocksWithFormula(
  stocks: Stock[],
  formula?: FormulaInput
): (Stock & { recommendationScore?: number })[] {
  if (!stocks || stocks.length === 0) return [];
  return scoreStocks(stocks, formula ?? defaultRecommendationFormula);
}

export function filterAndSortByRecommendation(
  stocks: Stock[],
  formula?: FormulaInput
): Stock[] {
  if (!stocks || stocks.length === 0) return [];
  return filterAndSortByScore(stocks, formula ?? defaultRecommendationFormula);
}
