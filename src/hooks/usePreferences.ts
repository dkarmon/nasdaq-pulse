// ABOUTME: Custom hook for persisting user preferences in localStorage.
// ABOUTME: Stores screener sort, limit, and filter settings across sessions.

"use client";

import { useState, useCallback } from "react";
import type { SortPeriod, FilterValue, ScreenerFilters } from "@/lib/market-data/types";

export type ScreenerPreferences = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  hiddenSymbols: string[];
};

const STORAGE_KEY = "nasdaq-pulse-prefs";

const defaultPreferences: ScreenerPreferences = {
  sortBy: "1m",
  limit: 50,
  filters: {
    max1m: "any",
    max6m: "any",
    max12m: "any",
  },
  hiddenSymbols: [],
};

function loadPreferences(): ScreenerPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(stored);
    return {
      sortBy: parsed.sortBy ?? defaultPreferences.sortBy,
      limit: parsed.limit ?? defaultPreferences.limit,
      filters: {
        max1m: parsed.filters?.max1m ?? defaultPreferences.filters.max1m,
        max6m: parsed.filters?.max6m ?? defaultPreferences.filters.max6m,
        max12m: parsed.filters?.max12m ?? defaultPreferences.filters.max12m,
      },
      hiddenSymbols: Array.isArray(parsed.hiddenSymbols) ? parsed.hiddenSymbols : [],
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
  const [preferences, setPreferences] = useState<ScreenerPreferences>(() => {
    if (typeof window === "undefined") {
      return defaultPreferences;
    }
    return loadPreferences();
  });
  const isLoaded = typeof window !== "undefined";

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

  const hideStock = useCallback((symbol: string) => {
    setPreferences((prev) => {
      if (prev.hiddenSymbols.includes(symbol)) {
        return prev;
      }
      const next = {
        ...prev,
        hiddenSymbols: [...prev.hiddenSymbols, symbol],
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const unhideStock = useCallback((symbol: string) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        hiddenSymbols: prev.hiddenSymbols.filter((s) => s !== symbol),
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const hasActiveFilters =
    preferences.filters.max1m !== "any" ||
    preferences.filters.max6m !== "any" ||
    preferences.filters.max12m !== "any";

  return {
    preferences,
    isLoaded,
    setSortBy,
    setLimit,
    setFilter,
    clearFilters,
    hasActiveFilters,
    hideStock,
    unhideStock,
  };
}
