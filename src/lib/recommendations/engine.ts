// ABOUTME: Safe evaluation and validation of recommendation formulas.
// ABOUTME: Relies on expr-eval with a tight whitelist of variables and functions.

import { Parser } from "expr-eval";
import {
  ALLOWED_FUNCTIONS,
  ALLOWED_VARIABLES,
  DEFAULT_FORMULA_ID,
  FORMULA_MAX_LENGTH,
  REQUIRED_GROWTH_VARIABLES,
  defaultRecommendationFormula,
} from "./config";
import type {
  RecommendationFormula,
  RecommendationFormulaSummary,
  ScoredStock,
} from "./types";
import type { Stock } from "@/lib/market-data/types";

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
};

// Build a parser instance with the minimal feature set we need.
function createParser() {
  const parser = new Parser({
    operators: {
      add: true,
      concatenate: false,
      conditional: false,
      divide: true,
      factorial: false,
      logical: false,
      multiply: true,
      power: false,
      remainder: false,
      subtract: true,
      comparison: false,
    },
  });

  // Limit available functions
  parser.functions = {
    min: Math.min,
    max: Math.max,
    avg: (...values: number[]) => {
      if (values.length === 0) return NaN;
      return values.reduce((sum, n) => sum + n, 0) / values.length;
    },
    clamp: (value: number, min: number, max: number) => {
      if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) return NaN;
      if (min > max) return NaN;
      return Math.min(Math.max(value, min), max);
    },
  };

  parser.consts = {};

  return parser;
}

const parser = createParser();

export function validateFormulaExpression(expression: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!expression || typeof expression !== "string") {
    return { valid: false, errors: ["Expression is required"], warnings, variables: [] };
  }

  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    return { valid: false, errors: ["Expression is required"], warnings, variables: [] };
  }

  if (trimmed.length > FORMULA_MAX_LENGTH) {
    errors.push(`Expression exceeds ${FORMULA_MAX_LENGTH} characters`);
  }

  let parsed;
  try {
    parsed = parser.parse(trimmed);
  } catch (err) {
    errors.push("Expression could not be parsed");
    return { valid: false, errors, warnings, variables: [] };
  }

  const variables = parsed.variables({ withMembers: false });
  const unknown = variables.filter((v) => !ALLOWED_VARIABLES.includes(v as (typeof ALLOWED_VARIABLES)[number]));
  if (unknown.length > 0) {
    errors.push(`Unknown variables: ${unknown.join(", ")}`);
  }

  const hasGrowthVar = variables.some((v) => REQUIRED_GROWTH_VARIABLES.includes(v as (typeof REQUIRED_GROWTH_VARIABLES)[number]));
  if (!hasGrowthVar) {
    errors.push("Formula must reference at least one growth metric");
  }

  // Warn if division by zero risk (very light heuristic)
  const tokens = trimmed.split(/[\s()+\-*\/]+/g);
  if (tokens.some((t) => t === "0")) {
    warnings.push("Contains literal zero; ensure denominators are not zero at runtime");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variables,
  };
}

function normalizeFormula(formula?: RecommendationFormula | RecommendationFormulaSummary | null): RecommendationFormula {
  if (!formula) {
    return defaultRecommendationFormula;
  }

  return {
    ...defaultRecommendationFormula,
    ...formula,
    id: formula.id || DEFAULT_FORMULA_ID,
    name: formula.name || defaultRecommendationFormula.name,
    expression: formula.expression || defaultRecommendationFormula.expression,
    status: formula.status || "published",
    version: formula.version || defaultRecommendationFormula.version,
  };
}

type EvaluationContext = {
  g1d?: number;
  growth1d?: number;
  g5d?: number;
  growth5d?: number;
  g1m: number;
  growth1m: number;
  g3m: number;
  growth3m: number;
  g6m: number;
  growth6m: number;
  g12m: number;
  growth12m: number;
  price: number;
  marketCap: number;
};

function buildContext(stock: Stock): EvaluationContext | null {
  if (
    stock.growth1m === undefined ||
    stock.growth3m === undefined ||
    stock.growth6m === undefined ||
    stock.growth12m === undefined
  ) {
    return null;
  }

  return {
    g1d: stock.growth1d,
    growth1d: stock.growth1d,
    g5d: stock.growth5d,
    growth5d: stock.growth5d,
    g1m: stock.growth1m,
    growth1m: stock.growth1m,
    g3m: stock.growth3m,
    growth3m: stock.growth3m,
    g6m: stock.growth6m,
    growth6m: stock.growth6m,
    g12m: stock.growth12m,
    growth12m: stock.growth12m,
    price: stock.price,
    marketCap: stock.marketCap,
  };
}

export function calculateRecommendationScore(
  stock: Stock,
  inputFormula?: RecommendationFormula | RecommendationFormulaSummary | null
): number | null {
  const context = buildContext(stock);
  if (!context) return null;

  const formula = normalizeFormula(inputFormula);
  const validation = validateFormulaExpression(formula.expression);
  if (!validation.valid) return null;

  try {
    const compiled = parser.parse(formula.expression.trim());
    const result = compiled.evaluate(context);
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

export function scoreStocks(
  stocks: Stock[],
  formula?: RecommendationFormula | RecommendationFormulaSummary | null
): ScoredStock[] {
  const normalizedFormula = normalizeFormula(formula);
  return stocks.map((stock) => {
    const score = calculateRecommendationScore(stock, normalizedFormula);
    return {
      ...stock,
      recommendationScore: score ?? undefined,
      recommendationFormulaId: normalizedFormula.id,
      recommendationFormulaVersion: normalizedFormula.version,
    };
  });
}

export function filterAndSortByScore(
  stocks: Stock[],
  formula?: RecommendationFormula | RecommendationFormulaSummary | null
): ScoredStock[] {
  return scoreStocks(stocks, formula)
    .filter((stock) => typeof stock.recommendationScore === "number" && Number.isFinite(stock.recommendationScore))
    .filter((stock) => (stock.recommendationScore ?? 0) > 0)
    .sort((a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0));
}
