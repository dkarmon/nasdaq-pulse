// ABOUTME: Shared types for recommendation formulas and settings.
// ABOUTME: Used by both API routes and client components.

import type { Stock } from "@/lib/market-data/types";

export type RecommendationFormulaStatus = "draft" | "published" | "archived";

export type RecommendationFormula = {
  id: string;
  name: string;
  description?: string | null;
  expression: string;
  status: RecommendationFormulaStatus;
  version: number;
  notes?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RecommendationSettings = {
  activeFormulaId: string | null;
  previewFormulaId?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
};

export type RecommendationFormulaSummary = Pick<
  RecommendationFormula,
  "id" | "name" | "description" | "expression" | "status" | "version" | "updatedAt"
>;

export type ScoredStock = Stock & {
  recommendationScore?: number;
  recommendationFormulaId?: string;
  recommendationFormulaVersion?: number;
};
