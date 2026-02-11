// ABOUTME: Client component orchestrating the screener UI state and data fetching.
// ABOUTME: Manages preferences, filters, sorting, exchange selection, and selected stock state.

"use client";

import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useLiveQuotes, type QuotesMap } from "@/hooks/useLiveQuotes";
import { StickyHeader } from "./sticky-header";
import { StockTable } from "./stock-table";
import { StockCardList } from "./stock-card";
import { scoreStocksWithFormula } from "@/lib/market-data/recommendation";
import type { Stock, ScreenerResponse, SortDirection, SortPeriod } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./screener-client.module.css";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import type { Recommendation } from "@/lib/ai/types";

const RECOMMENDED_SORT_OPTIONS: SortPeriod[] = [
  "score",
  "intraday",
  "1d",
  "5d",
  "1m",
  "3m",
  "6m",
  "12m",
];

function sortRecommendedStocks(
  stocks: Stock[],
  sortBy: SortPeriod,
  sortDirection: SortDirection,
  liveQuotes: QuotesMap
): Stock[] {
  const direction = sortDirection === "asc" ? 1 : -1;
  const sorted = [...stocks];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "intraday": {
        const aQuote = liveQuotes[a.symbol];
        const bQuote = liveQuotes[b.symbol];
        const aValue =
          typeof aQuote?.changePercent === "number" && Number.isFinite(aQuote.changePercent)
            ? aQuote.changePercent
            : null;
        const bValue =
          typeof bQuote?.changePercent === "number" && Number.isFinite(bQuote.changePercent)
            ? bQuote.changePercent
            : null;

        const aMissing = aValue === null;
        const bMissing = bValue === null;

        if (aMissing && bMissing) return 0;
        if (aMissing) return 1;
        if (bMissing) return -1;

        return (aValue - bValue) * direction;
      }
      case "1d": {
        const aValue = a.growth1d ?? 0;
        const bValue = b.growth1d ?? 0;
        return (aValue - bValue) * direction;
      }
      case "5d": {
        const aValue = a.growth5d ?? 0;
        const bValue = b.growth5d ?? 0;
        return (aValue - bValue) * direction;
      }
      case "6m":
        return (a.growth6m - b.growth6m) * direction;
      case "3m":
        return (a.growth3m - b.growth3m) * direction;
      case "12m":
        return (a.growth12m - b.growth12m) * direction;
      case "score": {
        const aValue = a.recommendationScore ?? 0;
        const bValue = b.recommendationScore ?? 0;
        return (aValue - bValue) * direction;
      }
      case "1m":
      default:
        return (a.growth1m - b.growth1m) * direction;
    }
  });

  return sorted;
}

type ScreenerClientProps = {
  initialData: ScreenerResponse;
  dict: Dictionary;
  onSelectStock: (symbol: string | null) => void;
  selectedSymbol: string | null;
  activeFormula: RecommendationFormulaSummary | null;
  onFormulaChange: (formula: RecommendationFormulaSummary | null) => void;
  isAdmin: boolean;
  navContent: ReactNode;
};

export function ScreenerClient({
  initialData,
  dict,
  onSelectStock,
  selectedSymbol,
  activeFormula,
  onFormulaChange,
  isAdmin,
  navContent,
}: ScreenerClientProps) {
  const {
    preferences,
    isLoaded,
    setSortBy,
    setSortDirection,
    setLimit,
    setExchange,
    hideStock,
    setShowRecommendedOnly,
    currentHiddenSymbols,
  } = usePreferences();

  const [stocks, setStocks] = useState<Stock[]>(initialData.stocks);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dailyAiBadges, setDailyAiBadges] = useState<Record<string, { recommendation: Recommendation; generatedAt: string }>>({});

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get symbols of recommended stocks for live quotes
  const scoredStocks = useMemo(
    () => scoreStocksWithFormula(stocks, activeFormula ?? undefined),
    [stocks, activeFormula]
  );

  const recommendedSymbols = useMemo(() => {
    return scoredStocks
      .filter((stock) => (stock.recommendationScore ?? 0) > 0)
      .map((s) => s.symbol);
  }, [scoredStocks]);

  // Fetch live quotes for recommended stocks
  const { quotes: liveQuotes } = useLiveQuotes(recommendedSymbols);

  // Fetch today's daily AI badge membership for the current exchange.
  useEffect(() => {
    if (!isLoaded) return;

    const exchange = preferences.exchange;
    fetch(`/api/daily-ai-badges?exchange=${exchange}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const badges = data?.badges ?? {};
        const map: Record<string, { recommendation: Recommendation; generatedAt: string }> = {};
        for (const [symbol, value] of Object.entries(badges)) {
          const v = value as any;
          if (!v?.recommendation || !v?.generatedAt) continue;
          map[String(symbol).toUpperCase()] = {
            recommendation: v.recommendation as Recommendation,
            generatedAt: v.generatedAt as string,
          };
        }
        setDailyAiBadges(map);
      })
      .catch(() => {
        setDailyAiBadges({});
      });
  }, [isLoaded, preferences.exchange, activeFormula?.id]);

  const fetchScreenerData = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      // When searching or in recommended mode, fetch all stocks to ensure search can find anything
      const needsAllStocks = preferences.showRecommendedOnly || debouncedSearch;
      const limit = needsAllStocks ? 9999 : preferences.limit;
      const apiSortBy =
        preferences.showRecommendedOnly &&
        (preferences.sortBy === "score" || preferences.sortBy === "intraday")
          ? "1m"
          : preferences.sortBy;

      const params = new URLSearchParams({
        sortBy: apiSortBy,
        limit: limit.toString(),
        exchange: preferences.exchange,
        recommendedOnly: preferences.showRecommendedOnly ? "true" : "false",
        includeScores: "true",
      });

      const response = await fetch(`/api/screener?${params}`);
      const data: ScreenerResponse = await response.json();

      setStocks(data.stocks);
      onFormulaChange(data.recommendation?.activeFormula ?? null);
    } catch (error) {
      console.error("Failed to fetch screener data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, preferences, onFormulaChange, debouncedSearch]);

  useEffect(() => {
    if (isLoaded) {
      fetchScreenerData();
    }
  }, [isLoaded, fetchScreenerData]);

  const controlLabels = {
    sortBy: dict.screener.sortBy,
    show: dict.screener.show,
    score: dict.screener.score,
    intraday: dict.screener.intraday,
    direction: dict.screener.direction,
    search: dict.screener.search,
    recommendedOnly: dict.screener.recommendedOnly,
    recommendedMode: dict.screener.recommendedMode,
    exchange: dict.screener.exchange,
    nasdaq: dict.screener.nasdaq,
    tlv: dict.screener.tlv,
  };

  const tableLabels = {
    stock: dict.screener.stock,
    price: dict.screener.price,
    growth: dict.screener.growth,
    growth1d: dict.screener.growth1d,
    growth5d: dict.screener.growth5d,
    growth1m: dict.screener.growth1m,
    growth3m: dict.screener.growth3m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    view: dict.screener.view,
    noStocks: dict.screener.noStocks,
    hide: dict.screener.hide,
    recommended: dict.screener.recommended,
  };

  const cardLabels = {
    noStocks: dict.screener.noStocks,
    hide: dict.screener.hide,
    recommended: dict.screener.recommended,
  };

  const aiLabels = {
    buy: dict.aiAnalysis?.buy ?? "Buy",
    hold: dict.aiAnalysis?.hold ?? "Hold",
    sell: dict.aiAnalysis?.sell ?? "Sell",
  };

  // Compute ranks before filtering - stocks are already sorted by the API
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    scoredStocks.forEach((stock, index) => {
      map.set(stock.symbol, index + 1);
    });
    return map;
  }, [scoredStocks]);

  let visibleStocks = scoredStocks.filter(
    (stock) => !currentHiddenSymbols.includes(stock.symbol)
  );

  // Client-side search: NASDAQ by ticker, TLV by Hebrew name
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    visibleStocks = visibleStocks.filter((stock) =>
      stock.exchange === "tlv"
        ? stock.nameHebrew?.toLowerCase().includes(query)
        : stock.symbol.toLowerCase().includes(query)
    );
  }

  if (preferences.showRecommendedOnly) {
    const recommendedOnly = visibleStocks.filter((stock) =>
      typeof stock.recommendationScore === "number" &&
      Number.isFinite(stock.recommendationScore) &&
      (stock.recommendationScore ?? 0) > 0
    );

    const effectiveSort =
      RECOMMENDED_SORT_OPTIONS.includes(preferences.sortBy) ? preferences.sortBy : "score";

    visibleStocks = sortRecommendedStocks(
      recommendedOnly,
      effectiveSort,
      preferences.sortDirection,
      liveQuotes
    );
  }

  return (
    <div className={styles.screener}>
      <StickyHeader
        navContent={navContent}
        exchange={preferences.exchange}
        sortBy={preferences.sortBy}
        sortDirection={preferences.sortDirection}
        limit={preferences.limit}
        searchQuery={searchQuery}
        showRecommendedOnly={preferences.showRecommendedOnly}
        controlsDisabled={preferences.showRecommendedOnly}
        onExchangeChange={setExchange}
        onSortChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        onLimitChange={setLimit}
        onSearchChange={setSearchQuery}
        onShowRecommendedOnlyChange={setShowRecommendedOnly}
        isAdmin={isAdmin}
        activeFormula={activeFormula}
        onFormulaChange={onFormulaChange}
        onRefresh={fetchScreenerData}
        isRefreshing={isLoading}
        visibleStocks={visibleStocks}
        rankMap={rankMap}
        labels={controlLabels}
      />

      <div className={styles.stockList} data-loading={isLoading}>
        <StockTable
          stocks={visibleStocks}
          sortBy={preferences.sortBy}
          selectedSymbol={selectedSymbol}
          onSelectStock={onSelectStock}
          onHideStock={hideStock}
          liveQuotes={liveQuotes}
          rankMap={rankMap}
          aiBadges={dailyAiBadges}
          aiLabels={aiLabels}
          labels={tableLabels}
        />

        <StockCardList
          stocks={visibleStocks}
          sortBy={preferences.sortBy}
          selectedSymbol={selectedSymbol}
          onSelectStock={onSelectStock}
          onHideStock={hideStock}
          liveQuotes={liveQuotes}
          rankMap={rankMap}
          aiBadges={dailyAiBadges}
          aiLabels={aiLabels}
          labels={cardLabels}
        />
      </div>
    </div>
  );
}
