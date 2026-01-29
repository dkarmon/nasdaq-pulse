// ABOUTME: Server-side helpers for reading and mutating recommendation formulas via Supabase.
// ABOUTME: Includes a small in-memory cache for the active formula.

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  DEFAULT_FORMULA_ID,
  defaultRecommendationFormula,
} from "./config";
import {
  RecommendationFormula,
  RecommendationFormulaStatus,
  RecommendationFormulaSummary,
} from "./types";
import { validateFormulaExpression } from "./engine";

const ACTIVE_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedActiveFormula: RecommendationFormula | null = null;
let cachedAt = 0;

function cacheActive(formula: RecommendationFormula | null) {
  cachedActiveFormula = formula;
  cachedAt = Date.now();
}

function isCacheFresh() {
  return cachedActiveFormula && Date.now() - cachedAt < ACTIVE_CACHE_TTL_MS;
}

export async function fetchActiveFormula(options?: {
  skipCache?: boolean;
  fallbackToDefault?: boolean;
}): Promise<RecommendationFormula | null> {
  if (!options?.skipCache && isCacheFresh()) {
    return cachedActiveFormula;
  }

  try {
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from("recommendation_settings")
      .select("active_formula_id")
      .eq("id", true)
      .maybeSingle();

    const activeId = settings?.active_formula_id;
    if (!activeId) {
      cacheActive(null);
      return options?.fallbackToDefault ? defaultRecommendationFormula : null;
    }

    const { data: formula } = await supabase
      .from("recommendation_formulas")
      .select("*")
      .eq("id", activeId)
      .eq("status", "published")
      .maybeSingle();

    const resolved = formula ?? null;
    cacheActive(resolved);
    if (!resolved && options?.fallbackToDefault) {
      return defaultRecommendationFormula;
    }
    return resolved;
  } catch {
    return options?.fallbackToDefault ? defaultRecommendationFormula : null;
  }
}

type ListOptions = {
  status?: RecommendationFormulaStatus | "all";
  includeArchived?: boolean;
};

export async function listFormulas(options?: ListOptions): Promise<RecommendationFormula[]> {
  const supabase = await createClient();
  let query = supabase.from("recommendation_formulas").select("*").order("updated_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  } else if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

type FormulaInput = {
  name: string;
  description?: string | null;
  expression: string;
  status?: RecommendationFormulaStatus;
  notes?: Record<string, unknown> | null;
};

export async function createFormula(
  input: FormulaInput,
  userId?: string | null
): Promise<RecommendationFormula> {
  const validation = validateFormulaExpression(input.expression);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommendation_formulas")
    .insert({
      name: input.name,
      description: input.description,
      expression: input.expression.trim(),
      status: input.status ?? "draft",
      notes: input.notes ?? null,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type UpdateInput = Partial<FormulaInput> & {
  status?: RecommendationFormulaStatus;
};

export async function updateFormula(
  id: string,
  input: UpdateInput,
  userId?: string | null
): Promise<RecommendationFormula> {
  if (input.expression) {
    const validation = validateFormulaExpression(input.expression);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {
    updated_by: userId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.expression !== undefined) updatePayload.expression = input.expression.trim();
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.notes !== undefined) updatePayload.notes = input.notes;

  const { data, error } = await supabase
    .from("recommendation_formulas")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  cacheActive(null); // bust cache in case active formula changed
  return data;
}

export async function archiveFormula(id: string, userId?: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recommendation_formulas")
    .update({
      status: "archived",
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  cacheActive(null);
}

export async function setActiveFormula(
  id: string,
  userId?: string | null
): Promise<{ activeFormulaId: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("recommendation_settings")
    .upsert({
      id: true,
      active_formula_id: id,
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  cacheActive(null);
  return { activeFormulaId: id };
}

export function summarizeFormula(formula: RecommendationFormula | null): RecommendationFormulaSummary | null {
  if (!formula) return null;
  return {
    id: formula.id,
    name: formula.name,
    description: formula.description,
    expression: formula.expression,
    status: formula.status,
    version: formula.version,
    updatedAt: formula.updatedAt ?? (formula as any).updated_at,
  };
}

export function clearActiveFormulaCache() {
  cacheActive(null);
}

export function getDefaultFormula() {
  return defaultRecommendationFormula;
}

import type { OmitRulesConfig, UserOmitPrefs } from "@/lib/market-data/types";

export async function fetchEffectiveOmitRules(
  userId: string | null
): Promise<OmitRulesConfig | null> {
  const supabase = createAdminClient();

  // If we have a user, check their preferences
  if (userId) {
    const { data: userPrefs } = await supabase
      .from("user_preferences")
      .select("omit_rules")
      .eq("user_id", userId)
      .maybeSingle();

    const userOmitPrefs = userPrefs?.omit_rules as UserOmitPrefs | null;

    // If user has sync off and custom rules, use those
    if (userOmitPrefs && !userOmitPrefs.syncWithAdmin && userOmitPrefs.customRules) {
      return userOmitPrefs.customRules;
    }
  }

  // Otherwise, fetch admin defaults
  const { data: settings } = await supabase
    .from("recommendation_settings")
    .select("omit_rules")
    .eq("id", true)
    .maybeSingle();

  return (settings?.omit_rules as OmitRulesConfig | null) ?? null;
}
