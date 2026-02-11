// ABOUTME: Custom hook for persisting user preferences in localStorage and Supabase.
// ABOUTME: Stores screener sort, limit, exchange, and hidden stocks settings.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SortPeriod, SortDirection, Exchange } from "@/lib/market-data/types";

export type HiddenSymbols = Record<Exchange, string[]>;

export type PreRecommendedState = {
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
};

export type ScreenerPreferences = {
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
  exchange: Exchange;
  hiddenSymbols: HiddenSymbols;
  showRecommendedOnly: boolean;
  preRecommendedState: PreRecommendedState | null;
};

const STORAGE_KEY = "nasdaq-pulse-prefs";
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

const defaultPreferences: ScreenerPreferences = {
  sortBy: "1m",
  sortDirection: "desc",
  limit: 50,
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
  sortDirection?: SortDirection;
  limit?: number;
  filters?: unknown;
  hiddenSymbols?: string[] | HiddenSymbols;
  showRecommendedOnly?: boolean;
  exchange?: Exchange;
  preRecommendedState?: Partial<PreRecommendedState> | null;
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

    const preRecommendedState = parsed.preRecommendedState
      ? {
        sortBy: parsed.preRecommendedState.sortBy ?? defaultPreferences.sortBy,
        sortDirection: parsed.preRecommendedState.sortDirection ?? defaultPreferences.sortDirection,
        limit: parsed.preRecommendedState.limit ?? defaultPreferences.limit,
      }
      : defaultPreferences.preRecommendedState;

    const normalizedSortBy = parsed.showRecommendedOnly &&
      parsed.sortBy &&
      !RECOMMENDED_SORT_OPTIONS.includes(parsed.sortBy)
      ? "score"
      : parsed.sortBy;

    return {
      sortBy: normalizedSortBy ?? defaultPreferences.sortBy,
      sortDirection: parsed.sortDirection ?? defaultPreferences.sortDirection,
      limit: parsed.limit ?? defaultPreferences.limit,
      exchange: parsed.exchange ?? defaultPreferences.exchange,
      hiddenSymbols: migrateHiddenSymbols(parsed.hiddenSymbols),
      showRecommendedOnly: parsed.showRecommendedOnly ?? defaultPreferences.showRecommendedOnly,
      preRecommendedState,
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
    exchange: prefs.exchange,
    hidden_symbols: prefs.hiddenSymbols,
    show_recommended_only: prefs.showRecommendedOnly,
  };
}

// Convert Supabase format to local preferences
function fromSupabaseFormat(data: {
  sort_by?: string;
  display_limit?: number;
  exchange?: string;
  hidden_symbols?: HiddenSymbols;
  show_recommended_only?: boolean;
}): Partial<ScreenerPreferences> {
  return {
    sortBy: (data.sort_by as SortPeriod) || defaultPreferences.sortBy,
    limit: data.display_limit || defaultPreferences.limit,
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

  const setSortDirection = useCallback((sortDirection: SortDirection) => {
    updatePreferences({ sortDirection });
  }, [updatePreferences]);

  const setLimit = useCallback((limit: number) => {
    updatePreferences({ limit });
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
        // Enabling: save current sort/limit state
        next = {
          ...prev,
          showRecommendedOnly: true,
          preRecommendedState: {
            sortBy: prev.sortBy,
            sortDirection: prev.sortDirection,
            limit: prev.limit,
          },
          sortBy: "score",
          sortDirection: "desc",
        };
      } else {
        // Disabling: restore sort/limit
        const restored = prev.preRecommendedState;
        next = {
          ...prev,
          showRecommendedOnly: false,
          preRecommendedState: null,
          ...(restored && {
            sortBy: restored.sortBy,
            sortDirection: restored.sortDirection,
            limit: restored.limit,
          }),
        };
      }

      savePreferences(next);
      syncToSupabase(next);
      return next;
    });
  }, []);

  // Get hidden symbols for current exchange
  const currentHiddenSymbols = preferences.hiddenSymbols[preferences.exchange];

  return {
    preferences,
    isLoaded,
    setSortBy,
    setSortDirection,
    setLimit,
    setExchange,
    hideStock,
    unhideStock,
    setShowRecommendedOnly,
    currentHiddenSymbols,
  };
}
