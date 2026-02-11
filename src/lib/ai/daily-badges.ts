// ABOUTME: Server-side helpers for computing and refreshing the daily top-20 AI recommendation badges.
// ABOUTME: Daily badges define which symbols show a buy/hold/sell pill in the screener.

import { createAdminClient } from "@/lib/supabase/server";
import type { Exchange } from "@/lib/market-data/types";
import { getStocks } from "@/lib/market-data/storage";
import { applyOmitRules } from "@/lib/market-data/omit-rules";
import { scoreStocksWithFormula } from "@/lib/market-data/recommendation";
import { fetchEffectiveOmitRules } from "@/lib/recommendations/server";
import { defaultRecommendationFormula, DEFAULT_FORMULA_ID } from "@/lib/recommendations/config";
import type { RecommendationFormula } from "@/lib/recommendations/types";
import { getStockDetail } from "@/lib/market-data";
import { generateStockAnalysis, type StockMetrics } from "@/lib/ai/gemini";
import type { Recommendation } from "@/lib/ai/types";
import type { Stock } from "@/lib/market-data/types";

export type DailyAiTrigger = "cron" | "formula_change" | "manual";

export type DailyAiBadge = {
  recommendation: Recommendation;
  generatedAt: string;
  analysisId: string;
};

export type DailyAiBadgesMap = Record<string, DailyAiBadge>;

export type RefreshBadgesResult = {
  exchange: Exchange;
  runDate: string; // YYYY-MM-DD UTC
  formulaId: string;
  added: string[];
  removed: string[];
  skipped: string[];
  failed: { symbol: string; error: string }[];
};

function utcRunDateString(now = new Date()): string {
  // ISO date portion is always UTC.
  return now.toISOString().slice(0, 10);
}

function utcStartOfDayIso(runDate: string): string {
  const [y, m, d] = runDate.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0)).toISOString();
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeGrowth3m(stock: Stock): Stock {
  if (typeof stock.growth3m === "number" && Number.isFinite(stock.growth3m)) {
    return stock;
  }

  return {
    ...stock,
    growth3m: (stock.growth1m + stock.growth6m) / 2,
  };
}

async function fetchFormulaById(formulaId: string | null): Promise<RecommendationFormula> {
  if (!formulaId || formulaId === DEFAULT_FORMULA_ID) {
    return defaultRecommendationFormula;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recommendation_formulas")
    .select("*")
    .eq("id", formulaId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return defaultRecommendationFormula;
  }

  return data as unknown as RecommendationFormula;
}

export async function computeTopRecommendedSymbols(options: {
  exchange: Exchange;
  formula: RecommendationFormula;
  limit?: number;
}): Promise<string[]> {
  const limit = options.limit ?? 20;
  const exchange = options.exchange;

  const stocks = await getStocks(exchange);
  if (!stocks || stocks.length === 0) return [];

  const omitRules = await fetchEffectiveOmitRules(null);
  const filtered = applyOmitRules(stocks.map(normalizeGrowth3m), omitRules, exchange);

  const scored = scoreStocksWithFormula(filtered, options.formula);
  const recommended = scored
    .filter((s) => typeof s.recommendationScore === "number" && Number.isFinite(s.recommendationScore) && (s.recommendationScore ?? 0) > 0)
    .sort((a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0))
    .slice(0, limit)
    .map((s) => normalizeSymbol(s.symbol));

  return recommended;
}

async function buildMetricsForSymbol(symbol: string): Promise<{ metrics: StockMetrics; companyName: string }> {
  const stockDetail = await getStockDetail(symbol);
  if (!stockDetail) {
    throw new Error("Stock not found");
  }

  const isTLV = symbol.endsWith(".TA");
  const metrics: StockMetrics = {
    price: stockDetail.quote.price,
    currency: isTLV ? "ILS" : "USD",
    marketCap: stockDetail.profile.marketCap,
    sector: stockDetail.profile.sector,
    industry: stockDetail.profile.industry,
    growth1d: stockDetail.growth1d,
    growth5d: stockDetail.growth5d,
    growth1m: stockDetail.growth1m,
    growth3m: stockDetail.growth3m,
    growth6m: stockDetail.growth6m,
    growth12m: stockDetail.growth12m,
    description: stockDetail.profile.description,
  };

  return {
    metrics,
    companyName: stockDetail.profile.name || symbol,
  };
}

async function findLatestAnalysisForSymbol(options: {
  supabase: ReturnType<typeof createAdminClient>;
  symbol: string;
  newerThanIso?: string;
}): Promise<{
  id: string;
  symbol: string;
  recommendation: Recommendation;
  generated_at: string;
} | null> {
  let query = options.supabase
    .from("stock_analyses")
    .select("id,symbol,recommendation,generated_at")
    .eq("symbol", options.symbol)
    .order("generated_at", { ascending: false })
    .limit(1);

  if (options.newerThanIso) {
    query = query.gte("generated_at", options.newerThanIso);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id as string,
    symbol: data.symbol as string,
    recommendation: data.recommendation as Recommendation,
    generated_at: data.generated_at as string,
  };
}

async function ensureDailyRun(options: {
  supabase: ReturnType<typeof createAdminClient>;
  runDate: string;
  exchange: Exchange;
  formula: RecommendationFormula;
  trigger: DailyAiTrigger;
}): Promise<{ id: string }> {
  const { data, error } = await options.supabase
    .from("daily_ai_runs")
    .upsert(
      {
        run_date: options.runDate,
        exchange: options.exchange,
        formula_id: options.formula.id,
        formula_version: options.formula.version,
        trigger: options.trigger,
        status: "running",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "exchange,run_date" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "Failed to create daily_ai_runs row");
  }

  return { id: data.id as string };
}

function getExchangeFromSymbol(symbol: string): Exchange {
  return symbol.endsWith(".TA") ? "tlv" : "nasdaq";
}

async function listExistingBadges(options: {
  supabase: ReturnType<typeof createAdminClient>;
  runId: string;
}): Promise<string[]> {
  const { data, error } = await options.supabase
    .from("daily_ai_badges")
    .select("symbol")
    .eq("run_id", options.runId);

  if (error || !data) return [];
  return (data as { symbol: string }[]).map((r) => normalizeSymbol(r.symbol));
}

async function deleteBadgesForSymbols(options: {
  supabase: ReturnType<typeof createAdminClient>;
  runId: string;
  symbols: string[];
}): Promise<void> {
  if (options.symbols.length === 0) return;
  const { error } = await options.supabase
    .from("daily_ai_badges")
    .delete()
    .eq("run_id", options.runId)
    .in("symbol", options.symbols);

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertBadge(options: {
  supabase: ReturnType<typeof createAdminClient>;
  runId: string;
  symbol: string;
  recommendation: Recommendation;
  analysisId: string;
  generatedAt: string;
}): Promise<void> {
  const { error } = await options.supabase
    .from("daily_ai_badges")
    .upsert(
      {
        run_id: options.runId,
        symbol: options.symbol,
        recommendation: options.recommendation,
        analysis_id: options.analysisId,
        generated_at: options.generatedAt,
      },
      { onConflict: "run_id,symbol" }
    );

  if (error) throw new Error(error.message);
}

async function finalizeRun(options: {
  supabase: ReturnType<typeof createAdminClient>;
  runId: string;
  status: "ok" | "partial" | "failed";
  error?: string | null;
}): Promise<void> {
  const { error } = await options.supabase
    .from("daily_ai_runs")
    .update({
      status: options.status,
      error: options.error ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.runId);

  if (error) throw new Error(error.message);
}

async function generateAndInsertAnalysis(options: {
  supabase: ReturnType<typeof createAdminClient>;
  symbol: string;
}): Promise<{ id: string; recommendation: Recommendation; generatedAt: string }> {
  const symbol = options.symbol;
  const { metrics, companyName } = await buildMetricsForSymbol(symbol);

  const result = await generateStockAnalysis(symbol, companyName, metrics);

  const nowIso = new Date().toISOString();
  const { data: inserted, error } = await options.supabase
    .from("stock_analyses")
    .insert({
      symbol,
      recommendation: result.analysis.recommendation,
      analysis_en: result.analysis.english,
      analysis_he: result.analysis.hebrew,
      news_sources: [],
      news_count: 0,
      model_version: result.modelVersion,
      generated_at: nowIso,
    })
    .select("id,recommendation,generated_at")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to insert analysis");
  }

  return {
    id: inserted.id as string,
    recommendation: inserted.recommendation as Recommendation,
    generatedAt: inserted.generated_at as string,
  };
}

export async function refreshDailyAiBadges(options: {
  exchange: Exchange;
  trigger: DailyAiTrigger;
  now?: Date;
  timeBudgetMs?: number;
}): Promise<RefreshBadgesResult> {
  const supabase = createAdminClient();
  const runDate = utcRunDateString(options.now);

  // Use the active formula in the DB (cron behavior).
  const { data: settings } = await supabase
    .from("recommendation_settings")
    .select("active_formula_id")
    .eq("id", true)
    .maybeSingle();
  const activeFormulaId = (settings?.active_formula_id as string | null) ?? DEFAULT_FORMULA_ID;
  const activeFormula = await fetchFormulaById(activeFormulaId);

  const run = await ensureDailyRun({
    supabase,
    runDate,
    exchange: options.exchange,
    formula: activeFormula,
    trigger: options.trigger,
  });

  const startOfDayIso = utcStartOfDayIso(runDate);
  const symbols = await computeTopRecommendedSymbols({
    exchange: options.exchange,
    formula: activeFormula,
    limit: 20,
  });

  const result: RefreshBadgesResult = {
    exchange: options.exchange,
    runDate,
    formulaId: activeFormula.id,
    added: [],
    removed: [],
    skipped: [],
    failed: [],
  };

  try {
    const newSet = new Set(symbols);
    const existing = await listExistingBadges({ supabase, runId: run.id });
    const existingSet = new Set(existing);
    const toRemove = existing.filter((symbol) => !newSet.has(symbol));

    // Remove kicked-out symbols only; keep still-valid rows to avoid partial wipeouts.
    await deleteBadgesForSymbols({ supabase, runId: run.id, symbols: toRemove });
    result.removed.push(...toRemove);
    toRemove.forEach((symbol) => existingSet.delete(symbol));

    const deadline = options.timeBudgetMs ? Date.now() + options.timeBudgetMs : null;

    // Small concurrency to avoid slow cron overruns.
    const CONCURRENCY = 4;
    let idx = 0;

    async function worker() {
      while (idx < symbols.length) {
        if (deadline && Date.now() > deadline) {
          return;
        }

        const symbol = symbols[idx++];
        try {
          // Keep existing row for this run when the symbol remains in top-20.
          if (existingSet.has(symbol)) {
            result.skipped.push(symbol);
            continue;
          }

          const existingToday = await findLatestAnalysisForSymbol({
            supabase,
            symbol,
            newerThanIso: startOfDayIso,
          });

          if (existingToday) {
            await upsertBadge({
              supabase,
              runId: run.id,
              symbol,
              recommendation: existingToday.recommendation,
              analysisId: existingToday.id,
              generatedAt: existingToday.generated_at,
            });
            result.skipped.push(symbol);
            continue;
          }

          try {
            const generated = await generateAndInsertAnalysis({ supabase, symbol });
            await upsertBadge({
              supabase,
              runId: run.id,
              symbol,
              recommendation: generated.recommendation,
              analysisId: generated.id,
              generatedAt: generated.generatedAt,
            });
            result.added.push(symbol);
            continue;
          } catch {
            // Fall back to latest historical analysis to avoid empty top-20 badges.
          }

          const reuseLatest = await findLatestAnalysisForSymbol({
            supabase,
            symbol,
          });
          if (reuseLatest) {
            await upsertBadge({
              supabase,
              runId: run.id,
              symbol,
              recommendation: reuseLatest.recommendation,
              analysisId: reuseLatest.id,
              generatedAt: reuseLatest.generated_at,
            });
            result.skipped.push(symbol);
            continue;
          }

          result.failed.push({ symbol, error: "No analysis available (generate + fallback failed)" });
        } catch (err) {
          result.failed.push({ symbol, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    const status = result.failed.length === 0 ? "ok" : (result.added.length + result.skipped.length > 0 ? "partial" : "failed");
    await finalizeRun({ supabase, runId: run.id, status });
    return result;
  } catch (err) {
    await finalizeRun({
      supabase,
      runId: run.id,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function refreshDailyAiBadgesOnFormulaChange(options: {
  previousFormulaId: string | null;
  newFormulaId: string;
  exchanges: Exchange[];
  trigger?: DailyAiTrigger;
  now?: Date;
  timeBudgetMs?: number;
}): Promise<Record<Exchange, RefreshBadgesResult>> {
  const supabase = createAdminClient();
  const runDate = utcRunDateString(options.now);
  const startOfDayIso = utcStartOfDayIso(runDate);
  const trigger = options.trigger ?? "formula_change";

  const prevFormula = await fetchFormulaById(options.previousFormulaId);
  const nextFormula = await fetchFormulaById(options.newFormulaId);

  const results = {} as Record<Exchange, RefreshBadgesResult>;

  for (const exchange of options.exchanges) {
    const run = await ensureDailyRun({
      supabase,
      runDate,
      exchange,
      formula: nextFormula,
      trigger,
    });

    const oldSet = new Set(await computeTopRecommendedSymbols({ exchange, formula: prevFormula, limit: 20 }));
    const newSymbols = await computeTopRecommendedSymbols({ exchange, formula: nextFormula, limit: 20 });
    const newSet = new Set(newSymbols);

    const existing = new Set(await listExistingBadges({ supabase, runId: run.id }));

    const toRemove: string[] = [];
    for (const sym of existing) {
      if (!newSet.has(sym)) toRemove.push(sym);
    }

    const toAddGenerate: string[] = [];
    for (const sym of newSet) {
      if (!oldSet.has(sym)) toAddGenerate.push(sym);
    }

    const result: RefreshBadgesResult = {
      exchange,
      runDate,
      formulaId: nextFormula.id,
      added: [],
      removed: [],
      skipped: [],
      failed: [],
    };

    // Remove kicked symbols from today's badge set.
    if (toRemove.length > 0) {
      await deleteBadgesForSymbols({ supabase, runId: run.id, symbols: toRemove });
      result.removed.push(...toRemove);
    }

    const deadline = options.timeBudgetMs ? Date.now() + options.timeBudgetMs : null;

    // Ensure every symbol in the new set has a badge row. We only run Gemini for the delta symbols.
    for (const symbol of newSymbols) {
      if (deadline && Date.now() > deadline) break;

      if (existing.has(symbol) && !toRemove.includes(symbol)) {
        continue;
      }

      try {
        const shouldGenerate = toAddGenerate.includes(symbol);

        // Prefer a same-day analysis for newly-added symbols; for intersection symbols, reuse any latest analysis.
        const reuse = await findLatestAnalysisForSymbol({
          supabase,
          symbol,
          newerThanIso: shouldGenerate ? startOfDayIso : undefined,
        });

        if (reuse && !shouldGenerate) {
          await upsertBadge({
            supabase,
            runId: run.id,
            symbol,
            recommendation: reuse.recommendation,
            analysisId: reuse.id,
            generatedAt: reuse.generated_at,
          });
          result.skipped.push(symbol);
          continue;
        }

        if (reuse && shouldGenerate) {
          await upsertBadge({
            supabase,
            runId: run.id,
            symbol,
            recommendation: reuse.recommendation,
            analysisId: reuse.id,
            generatedAt: reuse.generated_at,
          });
          result.skipped.push(symbol);
          continue;
        }

        // No reusable analysis: generate (always for delta; also if symbol has never had any analysis).
        const generated = await generateAndInsertAnalysis({ supabase, symbol });
        await upsertBadge({
          supabase,
          runId: run.id,
          symbol,
          recommendation: generated.recommendation,
          analysisId: generated.id,
          generatedAt: generated.generatedAt,
        });
        result.added.push(symbol);
      } catch (err) {
        result.failed.push({ symbol, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const status = result.failed.length === 0 ? "ok" : (result.added.length + result.skipped.length > 0 ? "partial" : "failed");
    await finalizeRun({ supabase, runId: run.id, status });
    results[exchange] = result;
  }

  return results;
}

export function getExchangeForSymbol(symbol: string): Exchange {
  return getExchangeFromSymbol(normalizeSymbol(symbol));
}
