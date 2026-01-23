// ABOUTME: Tests for usePreferences hook, focusing on filter behavior with recommended mode.
// ABOUTME: Verifies that min price filter remains active when recommended only is enabled.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreferences } from "@/hooks/usePreferences";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("usePreferences", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetAllMocks();
    // Mock fetch to avoid Supabase calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ preferences: null }),
      })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("min price filter with recommended only mode", () => {
    it("should keep minPrice filter when enabling recommended only", () => {
      const { result } = renderHook(() => usePreferences());

      // Set a min price filter
      act(() => {
        result.current.setMinPrice(10);
      });

      expect(result.current.preferences.filters.minPrice).toBe(10);

      // Enable recommended only
      act(() => {
        result.current.setShowRecommendedOnly(true);
      });

      // Min price should still be set
      expect(result.current.preferences.showRecommendedOnly).toBe(true);
      expect(result.current.preferences.filters.minPrice).toBe(10);
    });

    it("should allow changing minPrice while recommended only is active", () => {
      const { result } = renderHook(() => usePreferences());

      // Enable recommended only first
      act(() => {
        result.current.setShowRecommendedOnly(true);
      });

      // Set min price while in recommended mode
      act(() => {
        result.current.setMinPrice(25);
      });

      expect(result.current.preferences.filters.minPrice).toBe(25);

      // Change it again
      act(() => {
        result.current.setMinPrice(50);
      });

      expect(result.current.preferences.filters.minPrice).toBe(50);
    });

    it("should preserve minPrice when disabling recommended only", () => {
      const { result } = renderHook(() => usePreferences());

      // Set min price and enable recommended
      act(() => {
        result.current.setMinPrice(15);
      });
      act(() => {
        result.current.setShowRecommendedOnly(true);
      });

      expect(result.current.preferences.filters.minPrice).toBe(15);

      // Disable recommended only
      act(() => {
        result.current.setShowRecommendedOnly(false);
      });

      // Min price should still be preserved
      expect(result.current.preferences.filters.minPrice).toBe(15);
    });

    it("should restore sort and limit but keep current minPrice when disabling recommended only", () => {
      const { result } = renderHook(() => usePreferences());

      // Set initial state
      act(() => {
        result.current.setSortBy("6m");
        result.current.setLimit(25);
        result.current.setMinPrice(10);
      });

      // Enable recommended only (saves sort/limit to preRecommendedState)
      act(() => {
        result.current.setShowRecommendedOnly(true);
      });

      // Change minPrice while in recommended mode
      act(() => {
        result.current.setMinPrice(30);
      });

      // Disable recommended only
      act(() => {
        result.current.setShowRecommendedOnly(false);
      });

      // Sort and limit should be restored from preRecommendedState
      expect(result.current.preferences.sortBy).toBe("6m");
      expect(result.current.preferences.limit).toBe(25);
      // MinPrice should be the current value (30), not the saved one (10)
      expect(result.current.preferences.filters.minPrice).toBe(30);
    });
  });
});
