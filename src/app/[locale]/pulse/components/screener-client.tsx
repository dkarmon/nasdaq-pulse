// ABOUTME: Client component orchestrating the screener UI state and data fetching.
// ABOUTME: Manages preferences, filters, sorting, and selected stock state.

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { ControlsBar } from "./controls-bar";
import { StockTable } from "./stock-table";
import { StockCardList } from "./stock-card";
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
    setFilter,
    clearFilters,
    hasActiveFilters,
  } = usePreferences();

  const [stocks, setStocks] = useState<Stock[]>(initialData.stocks);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchScreenerData = useCallback(async (search?: string) => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: preferences.sortBy,
        limit: preferences.limit.toString(),
        min1m: String(preferences.filters.min1m),
        min6m: String(preferences.filters.min6m),
        min12m: String(preferences.filters.min12m),
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
    filters: dict.screener.filters,
    min: dict.screener.min,
    clearAll: dict.screener.clearAll,
    any: dict.screener.any,
    search: dict.screener.search,
  };

  const tableLabels = {
    stock: dict.screener.stock,
    price: dict.screener.price,
    cap: dict.screener.cap,
    growth: dict.screener.growth,
    growth1m: dict.screener.growth1m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    view: dict.screener.view,
    noStocks: dict.screener.noStocks,
  };

  const cardLabels = {
    noStocks: dict.screener.noStocks,
  };

  return (
    <div className={styles.screener}>
      <ControlsBar
        sortBy={preferences.sortBy}
        limit={preferences.limit}
        filters={preferences.filters}
        searchQuery={searchQuery}
        onSortChange={setSortBy}
        onLimitChange={setLimit}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        onSearchChange={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        labels={controlLabels}
      />

      <div className={styles.stockList} data-loading={isLoading}>
        <StockTable
          stocks={stocks}
          sortBy={preferences.sortBy}
          selectedSymbol={selectedSymbol}
          onSelectStock={onSelectStock}
          labels={tableLabels}
        />

        <StockCardList
          stocks={stocks}
          sortBy={preferences.sortBy}
          selectedSymbol={selectedSymbol}
          onSelectStock={onSelectStock}
          labels={cardLabels}
        />
      </div>
    </div>
  );
}
