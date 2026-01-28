// ABOUTME: Constants for recommendation formulas and allowed variables/operators.
// ABOUTME: Keeps the expression whitelist aligned between validator and evaluator.

import type { RecommendationFormula } from "./types";

export const DEFAULT_FORMULA_ID = "00000000-0000-0000-0000-000000000001";

export const defaultRecommendationFormula: RecommendationFormula = {
  id: DEFAULT_FORMULA_ID,
  name: "Acceleration v1",
  description: "Weighted acceleration of growth across 5D/1M/6M/12M with average growth multiplier.",
  expression:
    "(3*(g1m-g5d)/25 + 2*(g6m-g1m)/150 + (g12m-g6m)/182) * avg(g5d,g1m,g6m,g12m)",
  status: "published",
  version: 1,
  notes: {
    seeded: true,
  },
};

export const ALLOWED_VARIABLES = [
  "g1d",
  "growth1d",
  "g5d",
  "growth5d",
  "g1m",
  "growth1m",
  "g6m",
  "growth6m",
  "g12m",
  "growth12m",
  "price",
  "marketCap",
] as const;

export const REQUIRED_GROWTH_VARIABLES = [
  "g1d",
  "growth1d",
  "g5d",
  "growth5d",
  "g1m",
  "growth1m",
  "g6m",
  "growth6m",
  "g12m",
  "growth12m",
] as const;

export const ALLOWED_FUNCTIONS = ["min", "max", "avg", "clamp"] as const;

export const FORMULA_MAX_LENGTH = 2000;
