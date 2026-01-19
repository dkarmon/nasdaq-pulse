// ABOUTME: Custom hook for persisting user preferences in localStorage.
// ABOUTME: Stores screener sort, limit, filter, exchange, and hidden stocks settings.

"use client";

import { useState, useCallback, useEffect } from "react";
import type { SortPeriod, FilterValue, ScreenerFilters, Exchange } from "@/lib/market-data/types";

export type HiddenSymbols = Record<Exchange, string[]>;

export type ScreenerPreferences = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  exchange: Exchange;
  hiddenSymbols: HiddenSymbols;
  showRecommendedOnly: boolean;
};

const STORAGE_KEY = "nasdaq-pulse-prefs";

const defaultPreferences: ScreenerPreferences = {
  sortBy: "1m",
  limit: 50,
  filters: {
    max5d: "any",
    max1m: "any",
    max6m: "any",
    max12m: "any",
  },
  exchange: "nasdaq",
  hiddenSymbols: {
    nasdaq: [],
    tlv: [],
  },
  showRecommendedOnly: false,
};

type LegacyPreferences = {
  sortBy?: SortPeriod;
  limit?: number;
  filters?: ScreenerFilters;
  hiddenSymbols?: string[] | HiddenSymbols;
  showRecommendedOnly?: boolean;
  exchange?: Exchange;
};

function migrateHiddenSymbols(hiddenSymbols: string[] | HiddenSymbols | undefined): HiddenSymbols {
  // If already in new format
  if (hiddenSymbols && typeof hiddenSymbols === "object" && !Array.isArray(hiddenSymbols)) {
    return {
      nasdaq: hiddenSymbols.nasdaq ?? [],
      tlv: hiddenSymbols.tlv ?? [],
    };
  }

  // If old array format, migrate to nasdaq
  if (Array.isArray(hiddenSymbols)) {
    return {
      nasdaq: hiddenSymbols,
      tlv: [],
    };
  }

  // Default
  return { nasdaq: [], tlv: [] };
}

function loadPreferences(): ScreenerPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultPreferences;
    }

    const parsed: LegacyPreferences = JSON.parse(stored);

    return {
      sortBy: parsed.sortBy ?? defaultPreferences.sortBy,
      limit: parsed.limit ?? defaultPreferences.limit,
      filters: {
        max5d: parsed.filters?.max5d ?? defaultPreferences.filters.max5d,
        max1m: parsed.filters?.max1m ?? defaultPreferences.filters.max1m,
        max6m: parsed.filters?.max6m ?? defaultPreferences.filters.max6m,
        max12m: parsed.filters?.max12m ?? defaultPreferences.filters.max12m,
      },
      exchange: parsed.exchange ?? defaultPreferences.exchange,
      hiddenSymbols: migrateHiddenSymbols(parsed.hiddenSymbols),
      showRecommendedOnly: parsed.showRecommendedOnly ?? defaultPreferences.showRecommendedOnly,
    };
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(prefs: ScreenerPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<ScreenerPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    setIsLoaded(true);
  }, []);

  const updatePreferences = useCallback((updates: Partial<ScreenerPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      savePreferences(next);
      return next;
    });
  }, []);

  const setSortBy = useCallback((sortBy: SortPeriod) => {
    updatePreferences({ sortBy });
  }, [updatePreferences]);

  const setLimit = useCallback((limit: number) => {
    updatePreferences({ limit });
  }, [updatePreferences]);

  const setFilter = useCallback((period: keyof ScreenerFilters, value: FilterValue) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        filters: { ...prev.filters, [period]: value },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    updatePreferences({ filters: defaultPreferences.filters });
  }, [updatePreferences]);

  const setExchange = useCallback((exchange: Exchange) => {
    updatePreferences({ exchange });
  }, [updatePreferences]);

  const hideStock = useCallback((symbol: string) => {
    setPreferences((prev) => {
      const currentExchange = prev.exchange;
      const currentHidden = prev.hiddenSymbols[currentExchange];

      if (currentHidden.includes(symbol)) {
        return prev;
      }

      const next = {
        ...prev,
        hiddenSymbols: {
          ...prev.hiddenSymbols,
          [currentExchange]: [...currentHidden, symbol],
        },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const unhideStock = useCallback((symbol: string, exchange?: Exchange) => {
    setPreferences((prev) => {
      const targetExchange = exchange ?? prev.exchange;
      const next = {
        ...prev,
        hiddenSymbols: {
          ...prev.hiddenSymbols,
          [targetExchange]: prev.hiddenSymbols[targetExchange].filter((s) => s !== symbol),
        },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const setShowRecommendedOnly = useCallback((show: boolean) => {
    setPreferences((prev) => {
      const next = { ...prev, showRecommendedOnly: show };
      savePreferences(next);
      return next;
    });
  }, []);

  const hasActiveFilters =
    preferences.filters.max5d !== "any" ||
    preferences.filters.max1m !== "any" ||
    preferences.filters.max6m !== "any" ||
    preferences.filters.max12m !== "any";

  // Get hidden symbols for current exchange
  const currentHiddenSymbols = preferences.hiddenSymbols[preferences.exchange];

  return {
    preferences,
    isLoaded,
    setSortBy,
    setLimit,
    setFilter,
    clearFilters,
    hasActiveFilters,
    setExchange,
    hideStock,
    unhideStock,
    setShowRecommendedOnly,
    currentHiddenSymbols,
  };
}
