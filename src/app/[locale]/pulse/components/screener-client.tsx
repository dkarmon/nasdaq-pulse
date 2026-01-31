// ABOUTME: Client component orchestrating the screener UI state and data fetching.
// ABOUTME: Manages preferences, filters, sorting, exchange selection, and selected stock state.

"use client";

import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { StickyHeader } from "./sticky-header";
import { StockTable } from "./stock-table";
import { StockCardList } from "./stock-card";
import {
  filterAndSortByRecommendation,
  isStockRecommended,
  scoreStocksWithFormula,
} from "@/lib/market-data/recommendation";
import type { Stock, ScreenerResponse } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./screener-client.module.css";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";

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
      .filter((stock) => isStockRecommended(stock, activeFormula ?? undefined))
      .map((s) => s.symbol);
  }, [scoredStocks, activeFormula]);

  // Fetch live quotes for recommended stocks
  const { quotes: liveQuotes } = useLiveQuotes(recommendedSymbols);

  const fetchScreenerData = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      // When searching or in recommended mode, fetch all stocks to ensure search can find anything
      const needsAllStocks = preferences.showRecommendedOnly || debouncedSearch;
      const limit = needsAllStocks ? 9999 : preferences.limit;

      const params = new URLSearchParams({
        sortBy: preferences.sortBy,
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
    search: dict.screener.search,
    recommendedOnly: dict.screener.recommendedOnly,
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

  // Client-side search filtering preserves original ranks (ticker only)
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    visibleStocks = visibleStocks.filter((stock) =>
      stock.symbol.toLowerCase().includes(query)
    );
  }

  if (preferences.showRecommendedOnly) {
    visibleStocks = filterAndSortByRecommendation(visibleStocks, activeFormula ?? undefined);
  }

  return (
    <div className={styles.screener}>
      <StickyHeader
        navContent={navContent}
        exchange={preferences.exchange}
        sortBy={preferences.sortBy}
        limit={preferences.limit}
        searchQuery={searchQuery}
        showRecommendedOnly={preferences.showRecommendedOnly}
        controlsDisabled={preferences.showRecommendedOnly}
        onExchangeChange={setExchange}
        onSortChange={setSortBy}
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
          labels={cardLabels}
        />
      </div>
    </div>
  );
}
