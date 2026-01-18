// ABOUTME: Custom hook for persisting user preferences in localStorage.
// ABOUTME: Stores screener sort, limit, and filter settings across sessions.

"use client";

import { useState, useCallback } from "react";
import type { SortPeriod, FilterPreset, ScreenerFilters } from "@/lib/market-data/types";

export type ScreenerPreferences = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
};

const STORAGE_KEY = "nasdaq-pulse-prefs";

const defaultPreferences: ScreenerPreferences = {
  sortBy: "1m",
  limit: 50,
  filters: {
    min1m: "any",
    min6m: "any",
    min12m: "any",
  },
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
        min1m: parsed.filters?.min1m ?? defaultPreferences.filters.min1m,
        min6m: parsed.filters?.min6m ?? defaultPreferences.filters.min6m,
        min12m: parsed.filters?.min12m ?? defaultPreferences.filters.min12m,
      },
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

  const setFilter = useCallback((period: keyof ScreenerFilters, value: FilterPreset) => {
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

  const hasActiveFilters =
    preferences.filters.min1m !== "any" ||
    preferences.filters.min6m !== "any" ||
    preferences.filters.min12m !== "any";

  return {
    preferences,
    isLoaded,
    setSortBy,
    setLimit,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}
