// ABOUTME: Custom hook for persisting user preferences in localStorage and Supabase.
// ABOUTME: Stores screener sort, limit, filter, exchange, and hidden stocks settings.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SortPeriod, FilterValue, ScreenerFilters, Exchange } from "@/lib/market-data/types";

export type HiddenSymbols = Record<Exchange, string[]>;

export type PreRecommendedState = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
};

export type ScreenerPreferences = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  exchange: Exchange;
  hiddenSymbols: HiddenSymbols;
  showRecommendedOnly: boolean;
  preRecommendedState: PreRecommendedState | null;
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
  preRecommendedState: null,
};

type LegacyPreferences = {
  sortBy?: SortPeriod;
  limit?: number;
  filters?: ScreenerFilters;
  hiddenSymbols?: string[] | HiddenSymbols;
  showRecommendedOnly?: boolean;
  exchange?: Exchange;
  preRecommendedState?: PreRecommendedState | null;
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
      preRecommendedState: parsed.preRecommendedState ?? defaultPreferences.preRecommendedState,
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

// Convert local preferences to Supabase format
function toSupabaseFormat(prefs: ScreenerPreferences) {
  return {
    sort_by: prefs.sortBy,
    display_limit: prefs.limit,
    filters: prefs.filters,
    exchange: prefs.exchange,
    hidden_symbols: prefs.hiddenSymbols,
    show_recommended_only: prefs.showRecommendedOnly,
  };
}

// Convert Supabase format to local preferences
function fromSupabaseFormat(data: {
  sort_by?: string;
  display_limit?: number;
  filters?: ScreenerFilters;
  exchange?: string;
  hidden_symbols?: HiddenSymbols;
  show_recommended_only?: boolean;
}): Partial<ScreenerPreferences> {
  return {
    sortBy: (data.sort_by as SortPeriod) || defaultPreferences.sortBy,
    limit: data.display_limit || defaultPreferences.limit,
    filters: data.filters || defaultPreferences.filters,
    exchange: (data.exchange as Exchange) || defaultPreferences.exchange,
    hiddenSymbols: data.hidden_symbols || defaultPreferences.hiddenSymbols,
    showRecommendedOnly: data.show_recommended_only ?? defaultPreferences.showRecommendedOnly,
  };
}

async function syncToSupabase(prefs: ScreenerPreferences): Promise<void> {
  try {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSupabaseFormat(prefs)),
    });
  } catch {
    // Ignore sync errors - localStorage is the fallback
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<ScreenerPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage immediately, then fetch from Supabase
  useEffect(() => {
    const localPrefs = loadPreferences();
    setPreferences(localPrefs);
    setIsLoaded(true);

    // Fetch from Supabase in background
    async function fetchFromSupabase() {
      try {
        const res = await fetch("/api/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data.preferences) {
            // Server data wins - merge with local
            const serverPrefs = fromSupabaseFormat(data.preferences);
            setPreferences((prev) => {
              const merged = { ...prev, ...serverPrefs };
              savePreferences(merged);
              return merged;
            });
          } else {
            // No server prefs yet - push local to server
            syncToSupabase(localPrefs);
          }
        }
      } catch {
        // Ignore - localStorage is the fallback
      }
      setIsSynced(true);
    }

    fetchFromSupabase();
  }, []);

  const updatePreferences = useCallback((updates: Partial<ScreenerPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      savePreferences(next);

      // Debounced sync to Supabase
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToSupabase(next);
      }, 1000);

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

      // Debounced sync to Supabase
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToSupabase(next);
      }, 1000);

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

      // Sync to Supabase immediately for hide actions
      syncToSupabase(next);

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

      // Sync to Supabase immediately for unhide actions
      syncToSupabase(next);

      return next;
    });
  }, []);

  const setShowRecommendedOnly = useCallback((show: boolean) => {
    setPreferences((prev) => {
      let next: ScreenerPreferences;

      if (show) {
        // Enabling: save current state and clear filters
        next = {
          ...prev,
          showRecommendedOnly: true,
          preRecommendedState: {
            sortBy: prev.sortBy,
            limit: prev.limit,
            filters: { ...prev.filters },
          },
          filters: defaultPreferences.filters,
        };
      } else {
        // Disabling: restore previous state if available
        const restored = prev.preRecommendedState;
        next = {
          ...prev,
          showRecommendedOnly: false,
          preRecommendedState: null,
          ...(restored && {
            sortBy: restored.sortBy,
            limit: restored.limit,
            filters: { ...restored.filters },
          }),
        };
      }

      savePreferences(next);
      syncToSupabase(next);
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
