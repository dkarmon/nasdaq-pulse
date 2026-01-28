// ABOUTME: Client component orchestrating the screener UI state and data fetching.
// ABOUTME: Manages preferences, filters, sorting, exchange selection, and selected stock state.

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { ControlsBar } from "./controls-bar";
import { StockTable } from "./stock-table";
import { StockCardList } from "./stock-card";
import { filterAndSortByRecommendation, isStockRecommended } from "@/lib/market-data/recommendation";
import type { Stock, ScreenerResponse } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./screener-client.module.css";

type ScreenerClientProps = {
  initialData: ScreenerResponse;
  dict: Dictionary;
  onSelectStock: (symbol: string | null) => void;
  selectedSymbol: string | null;
};

export function ScreenerClient({
  initialData,
  dict,
  onSelectStock,
  selectedSymbol,
}: ScreenerClientProps) {
  const {
    preferences,
    isLoaded,
    setSortBy,
    setLimit,
    setMinPrice,
    clearFilters,
    hasActiveFilters,
    setExchange,
    hideStock,
    setShowRecommendedOnly,
    currentHiddenSymbols,
  } = usePreferences();

  const [stocks, setStocks] = useState<Stock[]>(initialData.stocks);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get symbols of recommended stocks for live quotes
  const recommendedSymbols = useMemo(() => {
    return stocks.filter(isStockRecommended).map((s) => s.symbol);
  }, [stocks]);

  // Fetch live quotes for recommended stocks
  const { quotes: liveQuotes } = useLiveQuotes(recommendedSymbols);

  const fetchScreenerData = useCallback(async (search?: string) => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      // When in recommended mode, fetch all stocks and filter client-side
      const limit = preferences.showRecommendedOnly ? 9999 : preferences.limit;

      const params = new URLSearchParams({
        sortBy: preferences.sortBy,
        limit: limit.toString(),
        minPrice: preferences.filters.minPrice !== null ? String(preferences.filters.minPrice) : "",
        exchange: preferences.exchange,
      });

      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/screener?${params}`);
      const data: ScreenerResponse = await response.json();

      setStocks(data.stocks);
    } catch (error) {
      console.error("Failed to fetch screener data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, preferences]);

  useEffect(() => {
    if (isLoaded) {
      fetchScreenerData(searchQuery || undefined);
    }
  }, [isLoaded, fetchScreenerData, searchQuery]);

  const controlLabels = {
    sortBy: dict.screener.sortBy,
    show: dict.screener.show,
    minPrice: dict.screener.minPrice,
    clearAll: dict.screener.clearAll,
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

  let visibleStocks = stocks.filter(
    (stock) => !currentHiddenSymbols.includes(stock.symbol)
  );

  if (preferences.showRecommendedOnly) {
    visibleStocks = filterAndSortByRecommendation(visibleStocks);
  }

  return (
    <div className={styles.screener}>
      <ControlsBar
        exchange={preferences.exchange}
        sortBy={preferences.sortBy}
        limit={preferences.limit}
        filters={preferences.filters}
        searchQuery={searchQuery}
        showRecommendedOnly={preferences.showRecommendedOnly}
        controlsDisabled={preferences.showRecommendedOnly}
        onExchangeChange={setExchange}
        onSortChange={setSortBy}
        onLimitChange={setLimit}
        onMinPriceChange={setMinPrice}
        onClearFilters={clearFilters}
        onSearchChange={setSearchQuery}
        onShowRecommendedOnlyChange={setShowRecommendedOnly}
        hasActiveFilters={hasActiveFilters}
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
          labels={tableLabels}
        />

        <StockCardList
          stocks={visibleStocks}
          sortBy={preferences.sortBy}
          selectedSymbol={selectedSymbol}
          onSelectStock={onSelectStock}
          onHideStock={hideStock}
          liveQuotes={liveQuotes}
          labels={cardLabels}
        />
      </div>
    </div>
  );
}
